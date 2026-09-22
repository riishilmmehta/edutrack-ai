const { pool } = require('../config/mysql');
const { writeAuditLog } = require('../utils/auditLog');
const Notification = require('../models/Notification');

/**
 * POST /api/grades
 * Teacher or Admin records or updates a grade
 */
async function recordGrade(req, res) {
  const { studentId, courseId, assessmentType = 'QUIZ', score, maxScore = 100, remarks = '' } = req.body;

  if (!studentId || !courseId || score === undefined) {
    return res.status(400).json({ success: false, error: 'studentId, courseId, and score are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO grades (school_id, student_id, course_id, assessment_type, score, max_score, graded_by, remarks)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.school_id, studentId, courseId, assessmentType, score, maxScore, req.user.id, remarks]
    );

    // Fetch student's user_id and course title for notification
    const [infoRows] = await conn.query(
      `SELECT s.user_id, co.title AS course_title
       FROM students s
       CROSS JOIN courses co
       WHERE s.id = ? AND co.id = ? AND s.school_id = ? AND co.school_id = ?`,
      [studentId, courseId, req.user.school_id, req.user.school_id]
    );

    await conn.commit();

    if (infoRows.length > 0) {
      const { user_id, course_title } = infoRows[0];
      await Notification.create({
        schoolId: req.user.school_id,
        userId: user_id,
        type: 'GRADE_PUBLISHED',
        title: `Grade Published: ${course_title}`,
        message: `Your score for ${assessmentType} in ${course_title} has been published: ${score}/${maxScore}`,
        metadata: { courseId, assessmentType, score, maxScore }
      }).catch(e => console.warn('Notification failed:', e.message));
    }

    await writeAuditLog({
      userId: req.user.id,
      action: 'GRADE_RECORDED',
      targetEntity: 'grades',
      targetId: result.insertId,
      details: { studentId, courseId, score, assessmentType },
      ipAddress: req.ip
    });

    return res.status(201).json({ success: true, message: 'Grade saved successfully', gradeId: result.insertId });
  } catch (err) {
    await conn.rollback();
    console.error('Record grade error:', err);
    return res.status(500).json({ success: false, error: 'Failed to record grade' });
  } finally {
    conn.release();
  }
}

/**
 * GET /api/grades
 * Retrieve grades (student views their own; teacher/admin can filter)
 */
async function getGrades(req, res) {
  const { studentId, courseId } = req.query;

  try {
    let query = `
      SELECT g.id, g.assessment_type, g.score, g.max_score, g.remarks, g.created_at,
             (g.score / g.max_score * 100) AS percentage,
             co.id AS course_id, co.code AS course_code, co.title AS course_title,
             s.id AS student_id, s.gr_number, u.name AS student_name
      FROM grades g
      JOIN courses co ON g.course_id = co.id
      JOIN students s ON g.student_id = s.id
      JOIN users u ON s.user_id = u.id
      WHERE g.school_id = ?
    `;
    const params = [req.user.school_id];

    if (req.user.role === 'STUDENT') {
      const [sRows] = await pool.query(`SELECT id FROM students WHERE user_id = ? AND school_id = ?`, [req.user.id, req.user.school_id]);
      if (sRows.length === 0) return res.json({ success: true, grades: [] });
      query += ` AND g.student_id = ?`;
      params.push(sRows[0].id);
    } else if (studentId) {
      query += ` AND g.student_id = ?`;
      params.push(studentId);
    }

    if (courseId) {
      query += ` AND g.course_id = ?`;
      params.push(courseId);
    }

    query += ` ORDER BY g.created_at DESC`;

    const [rows] = await pool.query(query, params);
    return res.json({ success: true, grades: rows });
  } catch (err) {
    console.error('Fetch grades error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch grades' });
  }
}

module.exports = { recordGrade, getGrades };
