const { getDBStatus } = require('../config/db');
const config = require('../config/config');

const checkHealth = (req, res) => {
  const dbStatus = getDBStatus();
  res.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    service: 'VeriTrust AI Backend (MERN Stack Edition)',
    version: '2.0.0',
    demo_mode: config.DEMO_MODE,
    subsystems: {
      database: dbStatus === 'connected' ? 'healthy (MongoDB)' : dbStatus,
      ocr_engine: 'ready',
      rules_engine: 'active'
    },
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  checkHealth
};
