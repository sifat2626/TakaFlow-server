const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyToken, isAdmin, isUser, isAgent, verifyPIN} = require('../middlewares/authMiddleware');

// Route to get all transactions
router.get('/transactions', verifyToken, transactionController.getAllTransactions);

// Route to get all transactions by a user
router.get('/transactions/me', verifyToken, transactionController.getAllTransactionsByUser);

// Route to get all cash-in requests for an agent
router.get('/cash-in-requests/me', verifyToken, isAgent, transactionController.getAllCashInRequestsForAgent);

// Route to initiate a cash-in request
router.post('/cash-in', verifyToken, isUser, transactionController.initiateCashInRequest);

// Route to approve a cash-in request by agent
router.put('/cash-in/:transactionId/approve', verifyToken, isAgent, transactionController.approveCashInRequest);

// Route to initiate a cash-out request by an agent
router.post('/cash-out', verifyToken, transactionController.initiateCashOutRequest);

// Route to send money
router.post('/send-money', verifyToken, verifyPIN, transactionController.sendMoney);

module.exports = router;
