const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const config = require('./config/config');
const { connectDB } = require('./config/db');
const { seedDatabase } = require('./data/seedRunner');
const apiRoutes = require('./routes');
const { authMiddleware } = require('./middleware/authMiddleware');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static uploads serving
app.use('/uploads', express.static(config.UPLOAD_DIR));

// Root and Health Endpoints
app.get('/', (req, res) => {
  res.json({
    service: 'VeriTrust AI Platform API',
    stack: 'MERN (MongoDB, Express, React, Node.js)',
    version: '2.0.0',
    endpoints: {
      health: '/api/v1/health',
      applications: '/api/v1/applications',
      documents: '/api/v1/documents',
      rules: '/api/v1/rules',
      reports: '/api/v1/reports',
      audit: '/api/v1/audit'
    }
  });
});

app.get('/health', (req, res) => {
  res.redirect('/api/v1/health');
});

// Mount V1 API with Auth Middleware
app.use('/api/v1', authMiddleware, apiRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Server startup
const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Seed initial data if collections empty
    await seedDatabase();

    // 3. Listen on port
    const server = app.listen(config.PORT, () => {
      console.log('====================================================');
      console.log(`🚀 VeriTrust AI (MERN Stack) Server Running!`);
      console.log(`📡 URL: http://localhost:${config.PORT}`);
      console.log(`📊 Health check: http://localhost:${config.PORT}/api/v1/health`);
      console.log(`🗄️  Database: MongoDB (${config.MONGODB_URI})`);
      console.log(`📁 Uploads dir: ${config.UPLOAD_DIR}`);
      console.log('====================================================');
    });

    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
