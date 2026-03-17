const bcrypt = require('bcryptjs');
const User = require('../models/user.model');

const getAdminUsers = async (req, res, next) => {
    try {
        const users = await User.find({})
            .select('-password')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            users,
        });
    } catch (error) {
        next(error);
    }
};

const createAdminUser = async (req, res, next) => {
    try {
        const { username, email, password, role, status } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username, email, and password are required',
            });
        }

        const normalizedEmail = String(email).trim().toLowerCase();

        const existing = await User.findOne({ email: normalizedEmail }).select('_id');
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'User with this email already exists',
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username: String(username).trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: role || 'counselor',
            status: status || 'active',
        });

        return res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status,
            },
        });
    } catch (error) {
        next(error);
    }
};

const updateAdminUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const { username, email, password, role, status } = req.body;

        if (typeof username !== 'undefined') user.username = String(username).trim();

        if (typeof email !== 'undefined') {
            const normalizedEmail = String(email).trim().toLowerCase();

            const existing = await User.findOne({
                email: normalizedEmail,
                _id: { $ne: user._id },
            }).select('_id');

            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Another user with this email already exists',
                });
            }

            user.email = normalizedEmail;
        }

        if (typeof role !== 'undefined') user.role = role;
        if (typeof status !== 'undefined') user.status = status;

        if (typeof password !== 'undefined' && String(password).trim()) {
            user.password = await bcrypt.hash(String(password).trim(), 10);
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'User updated successfully',
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role,
                status: user.status,
            },
        });
    } catch (error) {
        next(error);
    }
};

const deleteAdminUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        await user.deleteOne();

        return res.status(200).json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAdminUsers,
    createAdminUser,
    updateAdminUser,
    deleteAdminUser,
};