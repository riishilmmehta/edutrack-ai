const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const {
  markAttendance,
  getAttendance,
  getAttendanceStats
} = require('../controllers/attendanceController');

const router = express.Router();

// Teacher or Admin can mark attendance
router.post('/mark', requireAuth, requireRole('TEACHER', 'ADMIN'), markAttendance);

// View attendance history (authenticated)
router.get('/', requireAuth, getAttendance);

// Get stats for a student
router.get('/stats/:studentId', requireAuth, getAttendanceStats);

module.exports = router;
