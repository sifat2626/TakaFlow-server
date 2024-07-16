const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

// Route to initiate a cash-in request
router.post('/cash-in', verifyToken, transactionController.initiateCashInRequest);

// Route to approve a cash-in request by agent
router.put('/cash-in/:transactionId/approve', verifyToken, isAdmin, transactionController.approveCashInRequest);

module.exports = router;
