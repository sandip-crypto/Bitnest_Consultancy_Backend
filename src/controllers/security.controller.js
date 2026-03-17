
//  Get security info for current user

const getSecurityInfo = async (req, res) => {
    try {
        const user = req.user;
        const devices = user.devices.map(d => ({
            id: d.deviceId,
            name: d.deviceName,
            lastActive: d.lastActive,
            ip: d.ip,
        }));

        res.json({
            lastLogin: user.lastLogin,
            passwordChangedAt: user.passwordChangedAt,
            devices,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch security info' });
    }
};


// Logout from all devices except current

const logoutAllDevices = async (req, res) => {
    try {
        const user = req.user; // from auth middleware
        const currentDeviceId = req.headers['x-device-id'];

        if (!currentDeviceId) return res.status(400).json({ message: 'Device ID required' });

        // Keep only current session
        user.devices = user.devices.filter(d => d.deviceId === currentDeviceId);
        await user.save({ validateBeforeSave: false });

        res.status(200).json({ message: 'Logged out from all other devices' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to logout from all devices' });
    }
};

module.exports = {
    getSecurityInfo,
    logoutAllDevices,
};