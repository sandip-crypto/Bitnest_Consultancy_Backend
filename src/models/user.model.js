const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: 6,
            select: false, // Do not return password by default. Mongoose will NOT return the password field when we do const user = await User.findOne({ email });
        },

        role: {
            type: String,
            enum: ['user', 'admin', 'counselor'],
            default: 'user',
        },
        // Active / Inactive for login control
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
        
        refreshToken: {
            type: String,
            select: false, // Do not return refresh token by default
        },
    },
    {
        timestamps: true, // createdAt & updatedAt
    }
);

/**
 * Hash password before saving
 */

userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});


/**
 * Compare entered password with hashed password
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

/**
 * Remove sensitive fields when returning JSON
 */
userSchema.methods.toJSON = function () {
    const userObject = this.toObject();
    delete userObject.password;
    delete userObject.__v;
    return userObject;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
