const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const Notification = require('../models/Notification');

const router = express.Router();

// Get the logged-in user's notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to load notifications' });
  }
});

// Mark a notification as read
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { read: true }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update notification' });
  }
});

module.exports = router;
