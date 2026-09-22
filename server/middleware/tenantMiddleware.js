const db = require('../database/connection');

/**
 * Middleware to resolve the school from the request subdomain.
 * It checks the 'x-school-subdomain' header first (for local testing/frontend override),
 * and falls back to parsing req.hostname.
 */
const resolveTenant = async (req, res, next) => {
    try {
        let subdomain = req.headers['x-school-subdomain'];
        
        if (!subdomain) {
            const hostParts = req.hostname.split('.');
            // If the host is like msb.edutrackpro.com, the first part is the subdomain
            // If it's just localhost, we'll probably need the header.
            if (hostParts.length > 1 && hostParts[0] !== 'www') {
                subdomain = hostParts[0];
            } else {
                subdomain = req.hostname; // Fallback
            }
        }

        if (!subdomain) {
            return res.status(400).json({ success: false, message: 'Subdomain is missing' });
        }

        // Query the database for the school
        const [rows] = await db.query('SELECT * FROM schools WHERE subdomain = ?', [subdomain]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'School not found' });
        }

        const school = rows[0];

        if (school.status !== 'active' && school.status !== 'trial') {
            return res.status(403).json({ success: false, message: 'School account is suspended or inactive' });
        }

        // Attach school data to request object
        req.school = school;
        next();
    } catch (error) {
        console.error('Tenant resolution error:', error);
        res.status(500).json({ success: false, message: 'Internal server error during tenant resolution' });
    }
};

module.exports = {
    resolveTenant
};
