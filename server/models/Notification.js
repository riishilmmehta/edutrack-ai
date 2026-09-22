const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  schoolId: { type: Number, required: true, index: true },
  userId: { type: Number, required: true, index: true }, // maps to MySQL users.id
  type: {
    type: String,
    enum: ['WELCOME', 'FEE_REMINDER', 'GRADE_PUBLISHED', 'ATTENDANCE_ALERT', 'INTERVENTION', 'GENERAL'],
    default: 'GENERAL'
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  emailSent: { type: Boolean, default: false },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
