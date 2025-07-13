// 获取安全HTML处理函数 - 使用全局版本或创建本地版本
function getSanitizeHtml() {
    if (window.sanitizeHtml && typeof window.sanitizeHtml === 'function') {
        return window.sanitizeHtml;
    }
    return function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
}

// 通知系统客户端
class NotificationManager {
    constructor() {
        this.socket = null;
        this.notifications = [];
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }

    // 初始化Socket连接
    init(user) {
        if (!user) {return;}

        this.socket = io();
        
        this.socket.on('connect', () => {
            // 通知系统已连接
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // 加入相应的房间
            this.socket.emit('join-room', {
                userId: user.id,
                userType: user.role === 'student' ? 'student' : 'staff',
                classId: user.class || null
            });
            
            this.showConnectionStatus('已连接到通知系统', 'success');
        });

        this.socket.on('disconnect', () => {
            // 通知系统已断开连接
            this.isConnected = false;
            this.showConnectionStatus('通知系统连接断开', 'warning');
        });

        this.socket.on('connect_error', () => {
            console.error('通知系统连接失败');
            this.handleReconnect();
        });

        // 监听通知消息
        this.socket.on('notification', (notification) => {
            this.handleNotification(notification);
        });
    }

    // 处理重连
    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            // 尝试重连通知系统
            
            setTimeout(() => {
                if (this.socket) {
                    this.socket.connect();
                }
            }, 3000 * this.reconnectAttempts);
        } else {
            this.showConnectionStatus('无法连接到通知系统', 'danger');
        }
    }

    // 处理通知消息
    handleNotification(notification) {
        this.notifications.unshift({
            ...notification,
            id: Date.now() + Math.random(),
            read: false
        });

        // 限制通知数量
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }

        // 显示通知
        this.showNotification(notification);
        
        // 更新通知计数
        this.updateNotificationCount();
        
        // 保存到本地存储
        this.saveNotifications();
    }

    // 显示通知
    showNotification(notification) {
        const { type, message, timestamp } = notification;
        
        // 创建通知元素
        const notificationEl = document.createElement('div');
        notificationEl.className = `notification-toast toast align-items-center text-white bg-${this.getBootstrapClass(type)} border-0`;
        notificationEl.setAttribute('role', 'alert');
        notificationEl.setAttribute('aria-live', 'assertive');
        notificationEl.setAttribute('aria-atomic', 'true');
        
        notificationEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="${this.getIcon(type)} me-2"></i>
                    ${getSanitizeHtml()(message)}
                    <small class="d-block text-white-50 mt-1">${this.formatTime(timestamp)}</small>
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;

        // 添加到通知容器
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        
        container.appendChild(notificationEl);
        
        // 显示Toast
        const toast = new bootstrap.Toast(notificationEl, {
            autohide: true,
            delay: type === 'system' ? 10000 : 5000
        });
        toast.show();
        
        // 播放声音提示
        this.playNotificationSound(type);
        
        // Toast隐藏后移除元素
        notificationEl.addEventListener('hidden.bs.toast', () => {
            notificationEl.remove();
        });
    }

    // 显示连接状态
    showConnectionStatus(message, type) {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.className = `alert alert-${type} alert-dismissible fade show`;
            statusEl.innerHTML = `
                ${getSanitizeHtml()(message)}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
        }
    }

    // 获取Bootstrap颜色类
    getBootstrapClass(type) {
        const typeMap = {
            'info': 'primary',
            'success': 'success',
            'warning': 'warning',
            'error': 'danger',
            'assignment': 'info',
            'grade': 'success',
            'discussion': 'secondary',
            'system': 'dark',
            'announcement': 'primary'
        };
        return typeMap[type] || 'primary';
    }

    // 获取图标
    getIcon(type) {
        const iconMap = {
            'info': 'fas fa-info-circle',
            'success': 'fas fa-check-circle',
            'warning': 'fas fa-exclamation-triangle',
            'error': 'fas fa-times-circle',
            'assignment': 'fas fa-tasks',
            'grade': 'fas fa-chart-line',
            'discussion': 'fas fa-comments',
            'system': 'fas fa-cog',
            'announcement': 'fas fa-bullhorn'
        };
        return iconMap[type] || 'fas fa-bell';
    }

    // 播放通知声音
    playNotificationSound(type) {
        if (!this.shouldPlaySound()) {return;}
        
        const audio = new Audio();
        switch (type) {
            case 'error':
            case 'warning':
                audio.src = '/sounds/warning.mp3';
                break;
            case 'success':
                audio.src = '/sounds/success.mp3';
                break;
            default:
                audio.src = '/sounds/notification.mp3';
        }
        
        audio.volume = 0.3;
        audio.play().catch(e => {
            // 无法播放通知声音
        });
    }

    // 检查是否应该播放声音
    shouldPlaySound() {
        const settings = this.getNotificationSettings();
        return settings.sound && !settings.doNotDisturb;
    }

    // 格式化时间
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) {return '刚刚';}
        if (diffMins < 60) {return `${diffMins}分钟前`;}
        if (diffMins < 1440) {return `${Math.floor(diffMins / 60)}小时前`;}
        return date.toLocaleDateString('zh-CN');
    }

    // 更新通知计数
    updateNotificationCount() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const countEl = document.getElementById('notification-count');
        
        if (countEl) {
            if (unreadCount > 0) {
                countEl.textContent = unreadCount > 99 ? '99+' : unreadCount;
                countEl.style.display = 'inline';
            } else {
                countEl.style.display = 'none';
            }
        }
    }

    // 标记通知为已读
    markAsRead(notificationId) {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.updateNotificationCount();
            this.saveNotifications();
        }
    }

    // 标记所有通知为已读
    markAllAsRead() {
        this.notifications.forEach(n => n.read = true);
        this.updateNotificationCount();
        this.saveNotifications();
    }

    // 清除所有通知
    clearAll() {
        this.notifications = [];
        this.updateNotificationCount();
        this.saveNotifications();
    }

    // 获取通知列表
    getNotifications(limit = 20) {
        return this.notifications.slice(0, limit);
    }

    // 保存通知到本地存储
    saveNotifications() {
        try {
            localStorage.setItem('notifications', JSON.stringify(this.notifications));
        } catch (e) {
            console.error('保存通知失败:', e);
        }
    }

    // 从本地存储加载通知
    loadNotifications() {
        try {
            const saved = localStorage.getItem('notifications');
            if (saved) {
                this.notifications = JSON.parse(saved);
                this.updateNotificationCount();
            }
        } catch (e) {
            console.error('加载通知失败:', e);
            this.notifications = [];
        }
    }

    // 获取通知设置
    getNotificationSettings() {
        try {
            const settings = localStorage.getItem('notificationSettings');
            return settings ? JSON.parse(settings) : {
                sound: true,
                doNotDisturb: false,
                assignment: true,
                grade: true,
                discussion: true,
                system: true
            };
        } catch (e) {
            return {
                sound: true,
                doNotDisturb: false,
                assignment: true,
                grade: true,
                discussion: true,
                system: true
            };
        }
    }

    // 更新通知设置
    updateNotificationSettings(settings) {
        try {
            localStorage.setItem('notificationSettings', JSON.stringify(settings));
        } catch (e) {
            console.error('保存通知设置失败:', e);
        }
    }

    // 断开连接
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.isConnected = false;
        }
    }
}

// 全局通知管理器实例
const notificationManager = new NotificationManager();

// 在用户登录后初始化通知系统
function initNotifications(user) {
    notificationManager.loadNotifications();
    notificationManager.init(user);
}

// 在用户退出时断开连接
function disconnectNotifications() {
    notificationManager.disconnect();
}