const express = require('express');
const rateLimit = require('express-rate-limit');
const {
  login,
  register,
  changePassword,
  getPendingUsers,
  updateUserStatus
} = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Limit login attempts to slow down brute-force attacks
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, error: 'Too many login attempts. Please try again later.' }
});

router.post('/login', loginLimiter, login);

// Self-service registration (public, results in PENDING status)
router.post('/register', (req, res, next) => {
  req.body.createdBy = 'self';
  next();
}, register);

// Admin-panel registration (instantly ACTIVE, only admins can call this)
router.post('/register/admin', requireAuth, requireRole('ADMIN'), (req, res, next) => {
  req.body.createdBy = 'admin';
  next();
}, register);

// Change password for logged in user
router.post('/change-password', requireAuth, changePassword);

// Admin approval routes for self-registered accounts
router.get('/users/pending', requireAuth, requireRole('ADMIN'), getPendingUsers);
router.patch('/users/:id/status', requireAuth, requireRole('ADMIN'), updateUserStatus);

module.exports = router;
