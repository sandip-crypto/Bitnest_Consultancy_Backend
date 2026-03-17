const express = require('express');
const router = express.Router();

const {
    getSystemSettings,
    updateSystemSettings,
    getNotificationSettings,
    updateNotificationSettings,
} = require('../controllers/settings.controller');

const { protect, allowRoles } = require('../middleware/auth.middleware');

router.use(protect, allowRoles("admin"));

router
    .route('/system')
    .get(getSystemSettings)
    .put(updateSystemSettings);

router
    .route('/notifications')
    .get(getNotificationSettings)
    .put(updateNotificationSettings);

module.exports = router;