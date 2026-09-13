const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { getFees, recordPayment, waiveFee } = require('../controllers/feeController');

const router = express.Router();

// View fees (authenticated: students view own, staff views all)
router.get('/', requireAuth, getFees);

// Mark fee as paid (Accountant or Admin)
router.post('/pay', requireAuth, requireRole('ACCOUNTANT', 'ADMIN'), recordPayment);

// Waive fee (Accountant or Admin)
router.post('/waive', requireAuth, requireRole('ACCOUNTANT', 'ADMIN'), waiveFee);

module.exports = router;
