const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Device sub-schema
const deviceSchema = new mongoose.Schema({
    deviceId: { type: String, required: true },           // unique per session
    deviceName: { type: String },
    refreshToken: { type: String, select: false },       // hashed refresh token
    lastActive: { type: Date, default: Date.now },
    ip: { type: String },
    userAgent: { type: String },
});

// Main User schema
const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: 2,
            maxlength: 50,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
        },
        phone: { type: String, trim: true },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: 6,
            select: false,
        },
        role: {
            type: String,
            enum: ['user', 'admin', 'counselor'],
            default: 'user',
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        lastLogin: { type: Date, default: null },
        passwordChangedAt: { type: Date },
        devices: [deviceSchema],
        refreshToken: { type: String, select: false }, // current refresh token (optional)
    },
    {
        timestamps: true,
    }
);

/**
 * Hash password before saving
 */
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);

    // Update passwordChangedAt
    this.passwordChangedAt = new Date();
});

/**
 * Compare entered password with hashed password
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Clean JSON output (remove sensitive fields)
 */
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.__v;

    if (obj.devices) {
        obj.devices = obj.devices.map(d => ({
            deviceId: d.deviceId,
            deviceName: d.deviceName,
            lastActive: d.lastActive,
            ip: d.ip,
            userAgent: d.userAgent,
        }));
    }

    return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;