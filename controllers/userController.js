const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// User Registration
exports.registerUser = async (req, res) => {
    const { name, mobileNumber, email, pin, role } = req.body;

    try {
        const existingUser = await User.findOne({ $or: [{ email }, { mobileNumber }] });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email or mobile number already exists' });
        }

        const user = new User({
            name,
            mobileNumber,
            email,
            pin,
            role: role === 'agent' ? 'user' : 'user', // Always set role to 'user' initially
            status: role === 'agent' ? 'pending' : 'approved',
        });

        if (role !== 'agent') {
            user.balance = 40; // Bonus for new users
        }

        await user.save();

        // Automatically log in the user
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.EXPIRES_IN }
        );

        console.log(token)

        res.cookie('token', token, {
            httpOnly:true,
            secure: process.env.NODE_ENV==='production',
            sameSite: process.env.NODE_ENV==='production' ? 'none':'strict',
        }).status(201).json({
            message: 'Registration successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                balance: user.balance,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// User Login
exports.loginUser = async (req, res) => {
    const { identifier, pin } = req.body;

    try {
        // Check if the identifier is provided
        if (!identifier) {
            return res.status(401).json({ message: 'Email or Mobile Number is required' });
        }

        // Check if the pin is provided
        if (!pin) {
            return res.status(401).json({ message: 'PIN is required' });
        }

        // Check if the identifier is an email or mobile number
        const user = await User.findOne({
            $or: [{ email: identifier }, { mobileNumber: identifier }],
        });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Compare PIN
        const isMatch = await user.comparePIN(pin);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid PIN' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.EXPIRES_IN }
        );

        // Send the token as an HTTP-only cookie
        res.cookie('token', token, {
            httpOnly:true,
            secure: process.env.NODE_ENV==='production',
            sameSite: process.env.NODE_ENV==='production' ? 'none':'strict',
        }).status(200).json({
            message: 'Login successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                balance: user.balance,
            },
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// User Logout
exports.logoutUser = (req, res) => {
    res.clearCookie('token').json({ message: 'Logged out successfully' });
};

// Admin Approve Agent
exports.getAgentRequests = async (req, res) => {
    try {
        const agentRequests = await User.find({ role: 'user', status: 'pending' });
        res.status(200).json(agentRequests);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.approveAgent = async (req, res) => {
    const { userId } = req.params;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.status !== 'pending') {
            return res.status(400).json({ message: 'Invalid request' });
        }

        user.status = 'approved';
        if (user.role === 'user') {
            user.role = 'agent';
            user.balance = 10000; // Bonus for new agents
        }
        await user.save();

        res.status(200).json({ message: 'Agent approved successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


// Admin Get All Users
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Admin Update User Role
exports.updateUserRole = async (req, res) => {
    const { userId, role } = req.body;

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.role = role;
        await user.save();

        res.status(200).json({ message: 'User role updated successfully', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.checkBalance = async (req, res) => {
    const userId = req.user.id; // Assuming req.user contains user details including ID

    try {
        // Fetch user details including balance
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Respond with user's balance
        res.status(200).json({ balance: user.balance });
    } catch (error) {
        console.error('Error fetching user balance:', error);
        res.status(500).json({ message: 'Failed to fetch balance', error: error.message });
    }
};

exports.getUserData = async (req, res) => {
    const userId = req.user.id; // Assuming req.user contains user details including ID

    try {
        // Fetch user details
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Respond with user's data
        res.status(200).json({
            _id: user._id,
            name: user.name,
            mobileNumber: user.mobileNumber,
            email: user.email,
            role: user.role,
            status: user.status,
            balance: user.balance,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
        });
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ message: 'Failed to fetch user data', error: error.message });
    }
};

module.exports = exports;
