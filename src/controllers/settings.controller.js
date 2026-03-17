const Setting = require("../models/settings.model");

const SYSTEM_KEY = 'system_settings';
const NOTIFICATION_KEY = 'notification_settings';

const defaultSystemSettings = {
    organizationName: 'EduConsult',
    supportEmail: 'admin@educonsult.com',
    supportPhone: '+977-9800000000',
    enableNotifications: true,
    emailReminders: true,
    twoFactorAuth: false,
};

const defaultNotificationSettings = {
    newLeadNotifications: true,
    applicationUpdates: true,
    appointmentReminders: true,
    weeklySummaryReport: false,
};

const getOrCreateSetting = async (key, defaultValue) => {
    let setting = await Setting.findOne({ key });

    if (!setting) {
        setting = await Setting.create({
            key,
            value: defaultValue,
        });
    }

    return setting;
};

const getSystemSettings = async (req, res, next) => {
    try {
        const setting = await getOrCreateSetting(SYSTEM_KEY, defaultSystemSettings);

        return res.status(200).json({
            success: true,
            settings: setting.value,
        });
    } catch (error) {
        next(error);
    }
};

const updateSystemSettings = async (req, res, next) => {
    try {
        const {
            organizationName,
            supportEmail,
            supportPhone,
            enableNotifications,
            emailReminders,
            twoFactorAuth,
        } = req.body;

        const payload = {
            organizationName: String(organizationName || '').trim(),
            supportEmail: String(supportEmail || '').trim().toLowerCase(),
            supportPhone: String(supportPhone || '').trim(),
            enableNotifications: Boolean(enableNotifications),
            emailReminders: Boolean(emailReminders),
            twoFactorAuth: Boolean(twoFactorAuth),
        };

        if (!payload.organizationName || !payload.supportEmail || !payload.supportPhone) {
            return res.status(400).json({
                success: false,
                message: 'Organization name, support email, and support phone are required',
            });
        }

        const setting = await Setting.findOneAndUpdate(
            { key: SYSTEM_KEY },
            {
                key: SYSTEM_KEY,
                value: payload,
                updatedBy: req.user?._id || null,
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
            }
        );

        return res.status(200).json({
            success: true,
            message: 'System settings updated successfully',
            settings: setting.value,
        });
    } catch (error) {
        next(error);
    }
};

const getNotificationSettings = async (req, res, next) => {
    try {
        const setting = await getOrCreateSetting(
            NOTIFICATION_KEY,
            defaultNotificationSettings
        );

        return res.status(200).json({
            success: true,
            settings: setting.value,
        });
    } catch (error) {
        next(error);
    }
};

const updateNotificationSettings = async (req, res, next) => {
    try {
        const payload = {
            newLeadNotifications: Boolean(req.body.newLeadNotifications),
            applicationUpdates: Boolean(req.body.applicationUpdates),
            appointmentReminders: Boolean(req.body.appointmentReminders),
            weeklySummaryReport: Boolean(req.body.weeklySummaryReport),
        };

        const setting = await Setting.findOneAndUpdate(
            { key: NOTIFICATION_KEY },
            {
                key: NOTIFICATION_KEY,
                value: payload,
                updatedBy: req.user?._id || null,
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
            }
        );

        return res.status(200).json({
            success: true,
            message: 'Notification settings updated successfully',
            settings: setting.value,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSystemSettings,
    updateSystemSettings,
    getNotificationSettings,
    updateNotificationSettings,
};