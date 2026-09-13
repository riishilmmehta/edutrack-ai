const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { recordGrade, getGrades } = require('../controllers/gradeController');

const router = express.Router();

// Teacher or Admin can submit grades
router.post('/', requireAuth, requireRole('TEACHER', 'ADMIN'), recordGrade);

// View grades (authenticated)
router.get('/', requireAuth, getGrades);

module.exports = router;
