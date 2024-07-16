const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyToken, isAdmin } = require('../middlewares/authMiddleware');

// Route to get all transactions
router.get('/transactions', verifyToken, transactionController.getAllTransactions);


// Route to get all transactions by a user
router.get('/transactions/me', verifyToken, transactionController.getAllTransactionsByUser);

// Route to get all cash-in requests for an agent
router.get('/cash-in-requests/me', verifyToken, transactionController.getAllCashInRequestsForAgent);

// Route to initiate a cash-in request
router.post('/cash-in', verifyToken, transactionController.initiateCashInRequest);

// Route to approve a cash-in request by agent
router.put('/cash-in/:transactionId/approve', verifyToken, transactionController.approveCashInRequest);

module.exports = router;
