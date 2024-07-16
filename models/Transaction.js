const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const transactionSchema = new Schema({
    type: {
        type: String,
        enum: ['send', 'cash-out', 'cash-in', 'fee', 'bonus'],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
    },
    from: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true,
    },
    to: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true,
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
    date: {
        type: Date,
        default: Date.now,
    },
    description: {
        type: String,
        default: '',
    },
}, {
    timestamps: true,
});

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
