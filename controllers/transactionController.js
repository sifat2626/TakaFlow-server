
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Controller function to initiate a cash-in request
exports.initiateCashInRequest = async (req, res) => {
    const { agentNo, amount } = req.body;
    const userId = req.user.id; // Assuming req.user contains user details including ID

    try {
        // Check if the user is an admin or agent
        const user = await User.findById(userId);
        if (!user || user.role !== 'user') {
            return res.status(403).json({ message: 'Only users can initiate cash-in requests' });
        }

        // Find the agent by their mobile number
        const agent = await User.findOne({ mobileNumber: agentNo, role: 'agent' }).select('name mobileNumber');
        if (!agent) {
            return res.status(404).json({ message: 'Agent not found' });
        }

        // Create a new transaction/request record with pending status
        const transaction = new Transaction({
            type: 'cash-in',
            amount,
            from: userId,
            to: agent._id,
            status: 'pending', // Status is initially set to pending
        });

        await transaction.save();

        // Populate the 'from' and 'to' fields to include user and agent details without _id
        await Transaction.populate(transaction, { path: 'from to', select: 'name mobileNumber -_id' });

        // Optionally, notify the agent or update user interface accordingly
        res.status(201).json({ message: 'Cash-in request initiated successfully', transaction });
    } catch (error) {
        console.error('Error initiating cash-in request:', error);
        res.status(500).json({ message: 'Failed to initiate cash-in request', error: error.message });
    }
};


// Controller function for agent to approve a cash-in request
exports.approveCashInRequest = async (req, res) => {
    const { transactionId } = req.params;

    try {
        // Find the transaction/request by ID
        const transaction = await Transaction.findById(transactionId);

        if (!transaction || transaction.status !== 'pending') {
            return res.status(404).json({ message: 'Invalid transaction request or already processed' });
        }

        // Ensure only the assigned agent can approve this transaction
        // For simplicity, assume req.user contains agent details including ID
        const agentId = req.user.id;
        if (transaction.to.toString() !== agentId.toString()) {
            return res.status(403).json({ message: 'Unauthorized to approve this transaction' });
        }

        // Update transaction status to approved
        transaction.status = 'approved';
        await transaction.save();

        // Process the actual balance update in user's account
        const user = await User.findById(transaction.from);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Add the transaction amount to the user's balance
        user.balance += transaction.amount;
        await user.save();

        // Respond with the updated transaction object
        res.status(200).json({ message: 'Cash-in request approved successfully', transaction });
    } catch (error) {
        console.error('Error approving cash-in request:', error);
        res.status(500).json({ message: 'Failed to approve cash-in request', error: error.message });
    }
};
