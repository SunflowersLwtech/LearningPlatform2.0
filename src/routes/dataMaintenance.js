const express = require('express');
const { authenticate, checkPermission } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/permissions');
const {
  checkDataConsistency,
  fixDataInconsistencies,
  getDataStatistics,
  rebuildIndexes
} = require('../controllers/dataMaintenanceController');

const router = express.Router();

// 所有数据维护操作都需要系统管理员权限
router.use(authenticate);
router.use(checkPermission(PERMISSIONS.SYSTEM_ADMIN));

// 检查数据一致性
router.get('/consistency-check', checkDataConsistency);

// 修复数据不一致问题
router.post('/fix-inconsistencies', fixDataInconsistencies);

// 获取数据统计信息
router.get('/statistics', getDataStatistics);

// 重建索引
router.post('/rebuild-indexes', rebuildIndexes);

module.exports = router;