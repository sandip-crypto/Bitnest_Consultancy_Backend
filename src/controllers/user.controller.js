const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/user.model');
const bcrypt = require("bcryptjs");
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const { setAuthCookies, clearAuthCookies } = require('../utils/cookies');
const logger = require("../utils/logger");

// Register User
const registerUser = async (req, res, next) => {
    try {
        let { username, email, password } = req.body;

        // 1) Required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        // 2) Type checks
        if (
            typeof username !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid input type",
            });
        }

        // 3) Normalize & trim
        username = username.trim();
        email = email.trim().toLowerCase();
        password = password.trim();

        // 4) Basic length / format validation
        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({
                success: false,
                message: "Username must be between 3 and 50 characters",
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format",
            });
        }

        if (password.length < 6 || password.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Password must be between 6 and 100 characters",
            });
        }

        // 5) Check if user already exists (safe, validated email string)
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "User already exists",
            });
        }

        // 6) Create user with ONLY allowed fields
        // (password should be hashed in a pre-save hook on the User schema)
        const user = await User.create({
            username: username.toLowerCase()
                .split(" ")
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" "),
            email,
            password,
            // role: "user", // <- optionally force default role here
        });

        // 7) Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);


        // Hash the refresh token before saving
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

        // 8) Save refresh token in DB (hashed for security)
        user.refreshToken = hashedRefreshToken;
        await user.save({ validateBeforeSave: false });

        // 9) Set cookies
        setAuthCookies(res, accessToken, refreshToken);

        // 10) Remove password before sending user back
        const safeUser = user.toObject();
        delete safeUser.password;
        delete safeUser.refreshToken;

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: safeUser,
        });
    } catch (error) {
        next(error);
    }
};

// Login User
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: 'Email and password required' });

        const user = await User.findOne({ email }).select('+password');
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

        // Update last login
        user.lastLogin = new Date();

        // Create device/session
        const deviceId = crypto.randomUUID();
        const refreshToken = generateRefreshToken(user); // unhashed
        const hashedToken = await bcrypt.hash(refreshToken, 10);

        const deviceName = req.headers['user-agent']?.substring(0, 100) || 'Unknown Device';
        const ip = req.ip;

        user.devices.push({
            deviceId,
            deviceName,
            refreshToken: hashedToken,
            lastActive: new Date(),
            ip,
            userAgent: req.headers['user-agent'] || '',
        });

        await user.save({ validateBeforeSave: false });

        const accessToken = generateAccessToken(user);

        // Set cookies for frontend
        setAuthCookies(res, accessToken, refreshToken, deviceId);

        const safeUser = user.toJSON();
        res.status(200).json({ message: 'Logged in', user: safeUser, deviceId });
    } catch (err) {
        next(err);
    }
};

// Logout User
const logoutUser = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (refreshToken) {
            // Decode the refresh token to get the user ID
            const decoded = jwt.decode(refreshToken);

            if (decoded?.id) {
                // Remove refresh token from DB
                await User.findByIdAndUpdate(decoded.id, {
                    $unset: { refreshToken: "" },
                });
            }
        }

        // Clear both cookies
        clearAuthCookies(res); // clears accessToken & refreshToken cookies

        return res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });

    } catch (error) {
        logger.error("Logout Error:", error);
        return res.status(500).json({
            success: false,
            message: "Logout failed",
        });
    }
};

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};

        // 1) Basic presence check
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: "Current password and new password are required",
            });
        }

        // 2) Type checks
        if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
            return res.status(400).json({
                success: false,
                message: "Invalid input type",
            });
        }

        // 3) Normalize / trim
        const currentPwd = currentPassword.trim();
        const newPwd = newPassword.trim();

        // 4) Length / basic validation
        if (currentPwd.length < 6 || currentPwd.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Current password is invalid",
            });
        }

        if (newPwd.length < 6 || newPwd.length > 100) {
            return res.status(400).json({
                success: false,
                message: "New password must be between 6 and 100 characters",
            });
        }

        // Optional: prevent reusing same password
        if (currentPwd === newPwd) {
            return res.status(400).json({
                success: false,
                message: "New password must be different from current password",
            });
        }

        // 5) Make sure we have an authenticated user
        if (!req.user || !req.user._id) {
            return res.status(401).json({
                success: false,
                message: "Not authenticated",
            });
        }

        // 6) Fetch user with password
        const user = await User.findById(req.user._id).select("+password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // 7) Compare current password
        const isMatch = await bcrypt.compare(currentPwd, user.password);
        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect",
            });
        }

        // 8) Set new password (pre-save hook should hash it)
        user.password = newPwd;
        user.mustChangePassword = false; // if you're using this flag
        await user.save();

        return res.json({
            success: true,
            message: "Password updated successfully",
        });
    } catch (err) {
        logger.error("Change password error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

const addUser = async (req, res) => {
    try {
        // 0) Only admin can add users
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can add users",
            });
        }

        let { username, email, password, role, status } = req.body || {};

        // 1) Required fields
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Username, email and password are required",
            });
        }

        // 2) Type checks
        if (
            typeof username !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid input type",
            });
        }

        // 3) Normalize / trim
        username = username.trim();
        email = email.trim().toLowerCase();
        password = password.trim();

        // 4) Basic validation
        if (username.length < 3 || username.length > 50) {
            return res.status(400).json({
                success: false,
                message: "Username must be between 3 and 50 characters",
            });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format",
            });
        }

        if (password.length < 6 || password.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Password must be between 6 and 100 characters",
            });
        }

        // 5) Validate role & status (from admin) if provided
        const allowedRoles = ["admin", "user"];        // adjust to your app
        const allowedStatus = ["active", "inactive"];  // or others as needed

        if (role !== undefined) {
            if (typeof role !== "string" || !allowedRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid role value",
                });
            }
        }

        if (status !== undefined) {
            if (typeof status !== "string" || !allowedStatus.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status value",
                });
            }
        }

        // 6) Check if user already exists
        const exists = await User.findOne({ email });
        if (exists) {
            return res.status(400).json({
                success: false,
                message: "User already exists for this email",
            });
        }

        // 7) Create user (password hashed in pre-save hook)
        const user = await User.create({
            username: username
                .toLowerCase()
                .split(" ")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" "),
            email,
            password,
            role: role || "user",
            status: status || "active",
        });

        // 8) Don’t expose password or refreshToken
        const safeUser = user.toObject();
        delete safeUser.password;
        delete safeUser.refreshToken;

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            data: safeUser,
        });
    } catch (err) {
        logger.error("Add user error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

const editUser = async (req, res) => {
    try {
        // 0) Only admin can edit users
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can edit users",
            });
        }

        const userId = req.params.id;

        // Validate userId BEFORE using it
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            logger.info("Invalid userId in editUser:", userId);
            return res.status(400).json({
                success: false,
                message: "Invalid user ID",
            });
        }

        let { username, email, password, role, status } = req.body || {};

        if (req.body) {
            logger.info("Edit user request body:", req.body);
        } else {
            logger.info("No incoming data from edit user");
        }

        // 1) At least one field must be provided
        if (
            username === undefined &&
            email === undefined &&
            password === undefined &&
            role === undefined &&
            status === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "No fields provided to update",
            });
        }

        // 2) Fetch existing user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // 3) Normalize / validate fields if provided

        // username
        if (username !== undefined) {
            if (typeof username !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Invalid username type",
                });
            }
            username = username.trim();
            if (username.length < 3 || username.length > 50) {
                return res.status(400).json({
                    success: false,
                    message: "Username must be between 3 and 50 characters",
                });
            }
            user.username = username;
        }

        // email
        if (email !== undefined) {
            if (typeof email !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Invalid email type",
                });
            }
            email = email.trim().toLowerCase();

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid email format",
                });
            }

            // Check if email already used by another user
            const existing = await User.findOne({ email });

            if (existing && existing._id.toString() !== userId.toString()) {
                return res.status(400).json({
                    success: false,
                    message: "Another user already exists with this email",
                });
            }

            user.email = email;
        }

        // password
        if (password !== undefined && password !== "") {
            if (typeof password !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Invalid password type",
                });
            }
            password = password.trim();
            if (password.length < 6 || password.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be between 6 and 100 characters",
                });
            }
            // Will be hashed by pre-save hook
            user.password = password;
        }

        // role & status
        const allowedRoles = ["admin", "user"];
        const allowedStatus = ["active", "inactive"];

        if (role !== undefined) {
            if (typeof role !== "string" || !allowedRoles.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid role value",
                });
            }
            user.role = role;
        }

        if (status !== undefined) {
            if (typeof status !== "string" || !allowedStatus.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid status value",
                });
            }
            user.status = status;
        }

        // 4) Save updated user
        const updatedUser = await user.save();

        const safeUser = updatedUser.toObject();
        delete safeUser.password;

        return res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: safeUser,
        });
    } catch (err) {
        logger.error("Edit user error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

const deleteUser = async (req, res) => {
    try {
        // 0) Only admin can delete users
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can delete users",
            });
        }

        const userId = req.params.id;

        // (Optional) Prevent admin from deleting themselves:
        if (req.user._id && req.user._id.toString() === userId.toString()) {
            return res.status(400).json({
                success: false,
                message: "You cannot delete your own account",
            });
        }

        const deletedUser = await User.findByIdAndDelete(userId);

        if (!deletedUser) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (err) {
        logger.error("Delete user error:", err);
        return res.status(500).json({
            success: false,
            message: "Server error",
        });
    }
};

const getAllUsers = async (req, res, next) => {
    try {
        // 0) Only admins can view all users (adjust if your logic is different)
        if (!req.user || req.user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Only admins can view all users",
            });
        }

        // 1) Read and normalize query params
        let { page = "1", limit = "10" } = req.query || {};

        // Ensure they are numbers
        page = parseInt(page, 10);
        limit = parseInt(limit, 10);

        // 2) Validate page & limit
        if (
            !Number.isInteger(page) ||
            !Number.isInteger(limit) ||
            page < 1 ||
            limit < 1
        ) {
            return res.status(400).json({
                success: false,
                message: "Page and limit must be positive integers",
            });
        }

        // 3) Apply a max limit to avoid huge responses / DoS
        const MAX_LIMIT = 100;
        if (limit > MAX_LIMIT) {
            limit = MAX_LIMIT;
        }

        const skip = (page - 1) * limit;

        // 4) Fetch users & total count
        const [users, totalUsers] = await Promise.all([
            User.find({})
                .select("-password") // never send passwords
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments(),
        ]);

        return res.status(200).json({
            success: true,
            data: users,
            pagination: {
                total: totalUsers,
                page,
                pages: Math.ceil(totalUsers / limit),
                limit,
            },
        });
    } catch (error) {
        next(error); // forward to centralized error handler
    }
};

const refreshToken = async (req, res, next) => {
    try {
        const token = req.cookies.refreshToken;
        if (!token) return res.status(401).json({ success: false, message: "No refresh token provided" });

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        } catch {
            return res.status(403).json({ success: false, message: "Invalid or expired refresh token" });
        }

        const user = await User.findById(decoded.id).select("+refreshToken");
        if (!user || !user.refreshToken)
            return res.status(403).json({ success: false, message: "Refresh token not recognized" });

        const isMatch = await bcrypt.compare(token, user.refreshToken);
        if (!isMatch) return res.status(403).json({ success: false, message: "Refresh token mismatch" });

        // Generate new tokens
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        user.refreshToken = await bcrypt.hash(newRefreshToken, 10);
        await user.save({ validateBeforeSave: false });

        setAuthCookies(res, newAccessToken, newRefreshToken);

        return res.status(200).json({
            success: true,
            message: "Token refreshed",
            accessToken: newAccessToken, // send new access token to frontend
        });
    } catch (error) {
        next(error);
    }
};

const updateUserStatus = async (req, res, next) => {
    try {
        const { id } = req.params;       // user id to update
        const { status } = req.body;     // "active" | "inactive"

        if (!["active", "inactive"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status value",
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        user.status = status;
        await user.save();

        // If user is now inactive, force logout via WebSocket
        if (status !== "active") {
            const io = req.app.get("io");
            const userSockets = req.app.get("userSockets");

            const userIdStr = String(user._id);
            const sockets = userSockets?.get(userIdStr);

            if (sockets && sockets.size > 0) {
                sockets.forEach((socketId) => {
                    io.to(socketId).emit("force-logout", {
                        reason: "ACCOUNT_INACTIVE",
                    });
                });

                logger.info(
                    `Forced logout for user ${userIdStr} on ${sockets.size} socket(s)`
                );
            }
        }

        return res.json({
            success: true,
            message: "User status updated successfully",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
            },
        });
    } catch (err) {
        next(err);
    }
};

const getMe = async (req, res) => {
    return res.status(200).json({
        success: true,
        user: req.user,
    });
};

// Update user profile
const updateProfileInfo = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { username, phone } = req.body;

        if (!username && !phone) {
            return res.status(400).json({
                success: false,
                message: "At least one field (username or phone) must be provided.",
            });
        }

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        // Only update fields that are provided
        if (username) user.username = username;
        if (phone) user.phone = phone;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                _id: user._id,
                username: user.username,
                email: user.email, // keep email read-only for now
                phone: user.phone,
                role: user.role,
                status: user.status,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};

module.exports = { registerUser, loginUser, logoutUser, changePassword, addUser, editUser, deleteUser, getAllUsers, refreshToken, updateUserStatus, getMe, updateProfileInfo };
