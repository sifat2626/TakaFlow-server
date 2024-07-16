const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    pin: {
        type: String,
        required: true,
    },
    mobileNumber: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    role: {
        type: String,
        enum: ['user', 'agent', 'admin'],
        default: 'user', // Default role is 'user'
    },
    status: {
        type: String,
        enum: ['pending', 'approved'],
        default: 'pending', // Default status is 'pending'
    },
    balance: {
        type: Number,
        default: 0,
    },
}, {
    timestamps: true, // Automatically create createdAt and updatedAt fields
});

// Hash PIN before saving the user
userSchema.pre('save', async function (next) {
    if (!this.isModified('pin')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.pin = await bcrypt.hash(this.pin, salt);
    next();
});

// Method to compare PINs
userSchema.methods.comparePIN = async function (inputPIN) {
    return bcrypt.compare(inputPIN, this.pin);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
