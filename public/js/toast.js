/**
 * Toast提示系统 - 原生JavaScript实现
 * 基于Bootstrap样式系统，支持进度条和多种类型
 */

class ToastManager {
    constructor() {
        this.toasts = [];
        this.container = null;
        this.init();
    }

    // 初始化Toast容器
    init() {
        // 等待DOM加载完成
        if (document.body) {
            this.createContainer();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                this.createContainer();
            });
        }
    }

    // 创建Toast容器
    createContainer() {
        console.log('创建Toast容器');

        // 检查是否已存在容器
        if (document.getElementById('toast-container')) {
            this.container = document.getElementById('toast-container');
            console.log('使用现有Toast容器');
            return;
        }

        // 创建Toast容器
        this.container = document.createElement('div');
        this.container.id = 'toast-container';
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
        console.log('Toast容器创建完成:', this.container);
    }

    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 获取Toast配置
    getToastConfig(type) {
        const configs = {
            success: {
                bgColor: 'toast-success',
                borderColor: 'border-success',
                textColor: 'text-success',
                iconColor: 'text-success',
                icon: 'fas fa-check-circle',
                progressColor: 'bg-success'
            },
            error: {
                bgColor: 'toast-error',
                borderColor: 'border-danger',
                textColor: 'text-danger',
                iconColor: 'text-danger',
                icon: 'fas fa-exclamation-circle',
                progressColor: 'bg-danger'
            },
            warning: {
                bgColor: 'toast-warning',
                borderColor: 'border-warning',
                textColor: 'text-warning',
                iconColor: 'text-warning',
                icon: 'fas fa-exclamation-triangle',
                progressColor: 'bg-warning'
            },
            info: {
                bgColor: 'toast-info',
                borderColor: 'border-info',
                textColor: 'text-info',
                iconColor: 'text-info',
                icon: 'fas fa-info-circle',
                progressColor: 'bg-info'
            }
        };
        return configs[type] || configs.info;
    }

    // 创建Toast元素
    createToastElement(id, message, type, duration) {
        const config = this.getToastConfig(type);
        
        const toastEl = document.createElement('div');
        toastEl.className = `toast-item ${config.bgColor} ${config.borderColor}`;
        toastEl.setAttribute('data-toast-id', id);
        
        toastEl.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon">
                    <i class="${config.icon} ${config.iconColor}"></i>
                </div>
                <div class="toast-message ${config.textColor}">
                    ${this.sanitizeHtml(message)}
                </div>
                <button type="button" class="toast-close" onclick="toastManager.removeToast('${id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            ${duration > 0 ? `
                <div class="toast-progress">
                    <div class="toast-progress-bar ${config.progressColor}" style="animation: toast-progress ${duration}ms linear forwards;"></div>
                </div>
            ` : ''}
        `;

        return toastEl;
    }

    // HTML安全处理
    sanitizeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 显示Toast
    showToast(message, type = 'info', duration = null) {
        console.log('showToast调用:', { message, type, duration });

        // 确保容器存在
        if (!this.container) {
            console.warn('Toast容器不存在，重新创建');
            this.createContainer();
        }

        // 类型映射：将danger映射为error
        if (type === 'danger') {
            type = 'error';
        }

        // 设置默认持续时间
        if (duration === null) {
            const defaultDurations = {
                success: 3000,
                error: 5000,
                warning: 4000,
                info: 3000
            };
            duration = defaultDurations[type] || 3000;
        }

        const id = this.generateId();
        const toastEl = this.createToastElement(id, message, type, duration);

        console.log('Toast元素创建完成:', toastEl);

        // 添加到容器
        this.container.appendChild(toastEl);
        console.log('Toast添加到容器');

        // 添加到管理列表
        const toastData = {
            id,
            element: toastEl,
            type,
            message,
            duration,
            createdAt: Date.now()
        };
        this.toasts.push(toastData);

        // 限制Toast数量（最多5个）
        if (this.toasts.length > 5) {
            const oldestToast = this.toasts.shift();
            this.removeToastElement(oldestToast.element);
        }

        // 触发进入动画
        setTimeout(() => {
            toastEl.classList.add('toast-show');
            console.log('Toast显示动画触发');
        }, 10);

        // 自动移除
        if (duration > 0) {
            setTimeout(() => {
                this.removeToast(id);
            }, duration);
        }

        return id;
    }

    // 移除Toast
    removeToast(id) {
        const toastIndex = this.toasts.findIndex(toast => toast.id === id);
        if (toastIndex === -1) return;

        const toast = this.toasts[toastIndex];
        this.removeToastElement(toast.element);
        this.toasts.splice(toastIndex, 1);
    }

    // 移除Toast元素
    removeToastElement(element) {
        if (!element || !element.parentNode) return;
        
        element.classList.add('toast-hide');
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 300);
    }

    // 清除所有Toast
    clearAllToasts() {
        this.toasts.forEach(toast => {
            this.removeToastElement(toast.element);
        });
        this.toasts = [];
    }

    // 便捷方法
    showSuccess(message, duration = 3000) {
        return this.showToast(message, 'success', duration);
    }

    showError(message, duration = 5000) {
        return this.showToast(message, 'error', duration);
    }

    showWarning(message, duration = 4000) {
        return this.showToast(message, 'warning', duration);
    }

    showInfo(message, duration = 3000) {
        return this.showToast(message, 'info', duration);
    }
}

// 创建全局Toast管理器实例
let toastManager;

// 初始化函数
function initToastManager() {
    console.log('初始化Toast管理器');
    toastManager = new ToastManager();
    window.toastManager = toastManager;
    console.log('Toast管理器初始化完成:', toastManager);
}

// 确保DOM加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initToastManager);
} else {
    initToastManager();
}
