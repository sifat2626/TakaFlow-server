const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to verify JWT token
exports.verifyToken = (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(403).send('No token provided');
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send('Invalid token');
        }
        req.user = decoded;
        next();
    });
};

// Middleware to check if the user is an admin
exports.isAdmin = async (req, res, next) => {
    const email = req.user.email;

    try {
        const user = await User.findOne({ email });
        if (user && user.role === 'admin') {
            next();
        } else {
            res.status(403).json({ message: 'Access denied. Admins only.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while checking admin privileges' });
    }
};

// Middleware to check if the user is an agent
exports.isAgent = async (req, res, next) => {
    const email = req.user.email;

    try {
        const user = await User.findOne({ email });
        if (user && user.role === 'agent') {
            next();
        } else {
            res.status(403).json({ message: 'Access denied. Agents only.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while checking agent privileges' });
    }
};

// Middleware to check if the user is a regular user
exports.isUser = async (req, res, next) => {
    const email = req.user.email;

    try {
        const user = await User.findOne({ email });
        if (user && user.role === 'user') {
            next();
        } else {
            res.status(403).json({ message: 'Access denied. Users only.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while checking user privileges' });
    }
};

exports.verifyPIN = async (req, res, next) => {
    const { pin } = req.body;
    const userId = req.user.id; // Assuming req.user contains user details including PIN

    try {
        const user = await User.findById(userId)
        console.log(pin)
        const isMatch = await user.comparePIN(String(pin));
        if (!isMatch) {
            return res.status(403).json({ message: 'Invalid PIN' });
        }
        next(); // Continue to the next middleware or route handler
    } catch (error) {
        console.error('Error verifying PIN:', error);
        res.status(500).json({ message: 'Failed to verify PIN', error: error.message });
    }
};