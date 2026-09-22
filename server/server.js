require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { testConnection } = require('./config/mysql');
const { connectMongo } = require('./config/mongo');

const authRoutes = require('./routes/authRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const gradeRoutes = require('./routes/gradeRoutes');
const feeRoutes = require('./routes/feeRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const { resolveTenant } = require('./middleware/tenantMiddleware');

const app = express();

app.use(cors());
app.use(express.json());

let dbStatus = { mysql: false, mongo: false };

// Health check — useful for confirming the backend is actually reachable
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'EDUTrack backend is running',
    version: '1.0.0',
    databases: dbStatus
  });
});

// Apply tenant resolution to all API routes
app.use('/api', resolveTenant);

app.use('/api/schools', schoolRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/fees', feeRoutes);

// Catch-all 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Something went wrong' });
});

const PORT = process.env.PORT || 3000;

async function start() {
  dbStatus.mysql = await testConnection();
  dbStatus.mongo = await connectMongo();
  app.listen(PORT, () => {
    console.log(`🚀 EDUTrack backend running on port ${PORT}`);
    console.log(`📡 Health check available at http://localhost:${PORT}/api/health`);
  });
}

start();
