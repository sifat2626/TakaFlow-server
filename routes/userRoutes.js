const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

// User Registration
router.post('/register', userController.registerUser);

// User Login
router.post('/login', userController.loginUser);

// User Logout
router.post('/logout', verifyToken, userController.logoutUser);

// Admin Get All Agent Requests
router.get('/agent-requests', verifyToken, isAdmin, userController.getAgentRequests);

// Admin Approve Agent
router.put('/approve-agent/:userId', verifyToken, isAdmin, userController.approveAgent);

// Admin Get All Users
router.get('/users', verifyToken, isAdmin, userController.getAllUsers);

// Admin Update User Role
router.put('/update-role', verifyToken, isAdmin, userController.updateUserRole);

module.exports = router;
