const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { pool } = require('../config/mysql');

const router = express.Router();

/**
 * GET /api/schools/branding
 * Public route (but requires tenantMiddleware to have set req.school)
 * Returns the branding information for the resolved subdomain
 */
router.get('/branding', (req, res) => {
    if (!req.school) {
        return res.status(404).json({ success: false, message: 'School not resolved' });
    }

    res.json({
        success: true,
        branding: {
            school_name: req.school.school_name,
            logo_url: req.school.logo_url,
            primary_color: req.school.primary_color,
            secondary_color: req.school.secondary_color
        }
    });
});

/**
 * POST /api/schools/branding
 * Admin-only route to update the school's branding
 */
router.post('/branding', requireAuth, requireRole('ADMIN'), async (req, res) => {
    const { school_name, logo_url, primary_color, secondary_color } = req.body;
    
    // We update the school that matches req.user.school_id
    try {
        const [result] = await pool.query(
            `UPDATE schools 
             SET school_name = ?, logo_url = ?, primary_color = ?, secondary_color = ?
             WHERE id = ?`,
            [school_name, logo_url, primary_color, secondary_color, req.user.school_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'School not found' });
        }

        res.json({ success: true, message: 'Branding updated successfully' });
    } catch (err) {
        console.error('Update branding error:', err);
        res.status(500).json({ success: false, error: 'Failed to update branding' });
    }
});

module.exports = router;
