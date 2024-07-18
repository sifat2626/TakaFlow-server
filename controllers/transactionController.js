const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Controller function to get all transactions
exports.getAllTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find();
        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Failed to fetch transactions', error: error.message });
    }
};

// Controller function to initiate a cash-in request
exports.initiateCashInRequest = async (req, res) => {
    const { agentNo, amount, pin } = req.body;
    const userId = req.user.id; // Assuming req.user contains user details including ID

    try {
        // Check if the user is a regular user
        const user = await User.findById(userId);
        if (!user || user.role !== 'user') {
            return res.status(403).json({ message: 'Only users can initiate cash-in requests' });
        }

        // Convert the PIN to a string before comparison
        const pinString = String(pin);

        // Verify the user's PIN
        const isMatch = await user.comparePIN(pinString);
        if (!isMatch) {
            return res.status(403).json({ message: 'Invalid PIN' });
        }

        // Find the agent by their mobile number
        const agent = await User.findOne({ mobileNumber: agentNo, role: 'agent' });
        if (!agent) {
            return res.status(404).json({ message: 'Agent not found' });
        }

        // Create a new transaction record with pending status
        const transaction = new Transaction({
            type: 'cash-in',
            amount,
            from: userId,
            to: agent._id,
            status: 'pending', // Status is initially set to pending
        });

        await transaction.save();

        // Populate the 'from' and 'to' fields to include user and agent details
        await transaction.populate([
            { path: 'from', select: 'name mobileNumber' },
            { path: 'to', select: 'name mobileNumber' }
        ]);

        // Respond with the transaction object
        res.status(201).json({ message: 'Cash-in request initiated successfully', transaction });
    } catch (error) {
        console.error('Error initiating cash-in request:', error);
        res.status(500).json({ message: 'Failed to initiate cash-in request', error: error.message });
    }
};

// Controller function for agent to approve a cash-in request
exports.approveCashInRequest = async (req, res) => {
    const {transactionId} = req.params;
    const { pin } = req.body;
    const agentId = req.user.id; // Assuming req.user contains agent details including ID

    try {
        // Find the transaction/request by ID
        const transaction = await Transaction.findById(transactionId);

        if (!transaction || transaction.status !== 'pending') {
            return res.status(404).json({ message: 'Invalid transaction request or already processed' });
        }

        // Ensure only the assigned agent can approve this transaction
        if (transaction.to.toString() !== agentId.toString()) {
            return res.status(403).json({ message: 'Unauthorized to approve this transaction' });
        }

        // Find the agent by ID
        const agent = await User.findById(agentId);
        if (!agent) {
            return res.status(404).json({ message: 'Agent not found' });
        }

        // Verify the agent's PIN
        const isMatch = await agent.comparePIN(String(pin));
        if (!isMatch) {
            return res.status(403).json({ message: 'Invalid PIN' });
        }

        // Check if the agent has sufficient balance
        if (agent.balance < transaction.amount) {
            return res.status(400).json({ message: 'Agent has insufficient balance' });
        }

        // Deduct the amount from the agent's balance
        agent.balance -= transaction.amount;
        await agent.save();

        // Add the amount to the user's balance
        const user = await User.findById(transaction.from);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        user.balance += transaction.amount;
        await user.save();

        // Update transaction status to approved
        transaction.status = 'approved';
        await transaction.save();

        // Populate the 'from' and 'to' fields to include user and agent details
        await transaction.populate([
            { path: 'to', select: 'name mobileNumber balance -_id' },
            { path: 'from', select: 'name mobileNumber' }
        ]);

        // Respond with the updated transaction object
        res.status(200).json({ message: 'Cash-in request approved successfully', transaction });
    } catch (error) {
        console.error('Error approving cash-in request:', error);
        res.status(500).json({ message: 'Failed to approve cash-in request', error: error.message });
    }
};


// Controller function to get all transactions by a user
exports.getAllTransactionsByUser = async (req, res) => {
    const userId = req.user.id; // Assuming req.user contains user details including ID

    try {
        const transactions = await Transaction.find({ $or: [{ from: userId }, { to: userId }] })
            .populate('from', 'name mobileNumber')
            .populate('to', 'name mobileNumber')
            .sort({ createdAt: -1 }); // Optionally, sort by createdAt in descending order

        res.status(200).json({ transactions });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ message: 'Failed to fetch transactions', error: error.message });
    }
};

// Controller function to get all cash-in requests for an agent
exports.getAllCashInRequestsForAgent = async (req, res) => {
    const agentId = req.user.id; // Assuming req.user contains agent details including ID

    try {
        const cashInRequests = await Transaction.find({ to: agentId, type: 'cash-in', status: 'pending' })
            .populate('from', 'name mobileNumber')
            .populate('to', 'name mobileNumber')
            .sort({ createdAt: -1 }); // Optionally, sort by createdAt in descending order

        res.status(200).json({ cashInRequests });
    } catch (error) {
        console.error('Error fetching cash-in requests:', error);
        res.status(500).json({ message: 'Failed to fetch cash-in requests', error: error.message });
    }
};

// Controller function to initiate a cash-out request
exports.initiateCashOutRequest = async (req, res) => {
    const { agentMobileNo, amount, pin } = req.body;
    const userId = req.user.id; // Assuming req.user contains user details including ID

    try {
        // Check if the request is made by a user
        const user = await User.findById(userId);
        if (!user || user.role !== 'user') {
            return res.status(403).json({ message: 'Only users can initiate cash-out requests' });
        }

        // Verify the user's PIN
        const isMatch = await user.comparePIN(pin);
        if (!isMatch) {
            return res.status(403).json({ message: 'Invalid PIN' });
        }

        // Calculate the fee (1.5% of the transaction amount)
        const fee = amount * 0.015;
        const totalAmount = amount + fee;

        // Check if the user has sufficient balance
        if (user.balance < totalAmount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Find the agent by their mobile number
        const agent = await User.findOne({ mobileNumber: agentMobileNo, role: 'agent' });
        if (!agent) {
            return res.status(404).json({ message: 'Agent not found' });
        }

        // Create a new transaction record
        const transaction = new Transaction({
            type: 'cash-out',
            amount,
            fee,
            from: user._id, // Assign the user's ObjectId directly
            to: agent._id, // Assign the agent's ObjectId directly
            status: 'pending', // Status is initially set to pending
        });

        // Save the transaction
        await transaction.save();

        // Adjust balances
        user.balance -= totalAmount;
        await user.save();

        agent.balance += totalAmount;
        await agent.save();

        // Update transaction status to 'approved'
        transaction.status = 'approved';
        await transaction.save();

        // Populate the 'from' and 'to' fields to include user and agent details
        await transaction.populate([
            { path: 'from', select: 'name mobileNumber balance' },
            { path: 'to', select: 'name mobileNumber' }
        ]);

        // Respond with the updated transaction object
        res.status(201).json({ message: 'Cash-out request completed successfully', transaction });
    } catch (error) {
        console.error('Error initiating cash-out request:', error);
        res.status(500).json({ message: 'Failed to complete cash-out request', error: error.message });
    }
};

exports.sendMoney = async (req, res) => {
    const { recipientNum, amount, pin } = req.body;
    const senderId = req.user.id; // Assuming req.user contains sender details including ID

    try {
        // Fetch sender details
        const sender = await User.findById(senderId);
        if (!sender) {
            return res.status(404).json({ message: 'Sender not found' });
        }

        // Validate transaction amount (minimum 50 taka)
        if (amount < 50) {
            return res.status(400).json({ message: 'Minimum transaction amount is 50 taka' });
        }

        // Calculate fee for transactions over 100 taka
        let fee = 0;
        if (amount > 100) {
            fee = 5;
        }

        // Check sender's balance
        if (sender.balance < amount + fee) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }

        // Find recipient by mobile number
        const recipient = await User.findOne({ mobileNumber: recipientNum });
        if (!recipient) {
            return res.status(404).json({ message: 'Recipient not found' });
        }

        // Create new transaction
        const transaction = new Transaction({
            type: 'send-money',
            amount,
            fee,
            from: sender._id,
            to: recipient._id,
            status: 'approved', // Assuming the transaction is completed directly
        });

        // Save transaction
        await transaction.save();

        // Update sender's balance
        sender.balance -= (amount + fee);
        await sender.save();

        // Update recipient's balance
        recipient.balance += amount;
        await recipient.save();

        // Populate sender and recipient fields in transaction
        await Transaction.populate(transaction, { path: 'from to' });

        // Respond with transaction details
        res.status(201).json({
            message: 'Money sent successfully',
            transaction: {
                _id: transaction._id,
                type: transaction.type,
                amount: transaction.amount,
                fee: transaction.fee,
                status: transaction.status,
                createdAt: transaction.createdAt,
                from: {
                    _id: sender._id,
                    name: sender.name,
                    mobileNumber: sender.mobileNumber,
                    balance: sender.balance
                },
                to: {
                    _id: recipient._id,
                    name: recipient.name,
                    mobileNumber: recipient.mobileNumber,
                }
            }
        });
    } catch (error) {
        console.error('Error sending money:', error);
        res.status(500).json({ message: 'Failed to send money', error: error.message });
    }
};







