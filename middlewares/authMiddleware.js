const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Make sure this is imported

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
