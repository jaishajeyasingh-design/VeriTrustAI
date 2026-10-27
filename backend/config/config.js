const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config(); // also check backend/.env if present

const rootDir = path.resolve(__dirname, '..');
const uploadDir = process.env.UPLOAD_DIR 
  ? path.resolve(process.cwd(), process.env.UPLOAD_DIR)
  : path.join(rootDir, 'uploads');
const reportsDir = process.env.REPORTS_DIR
  ? path.resolve(process.cwd(), process.env.REPORTS_DIR)
  : path.join(uploadDir, 'reports');

// Ensure upload & reports directories exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/veritrustai',
  UPLOAD_DIR: uploadDir,
  REPORTS_DIR: reportsDir,
  MAX_UPLOAD_SIZE: parseInt(process.env.MAX_UPLOAD_SIZE_BYTES, 10) || 15728640, // 15 MB
  API_KEYS: [
    process.env.API_KEY || 'vt_live_948f9210bcdef45a78',
    'vt_live_948f9210bcdef45a78',
    'vt_dev_supersecret_key_2026',
    'test_secret_key_123'
  ],
  DEMO_MODE: process.env.DEMO_MODE === 'true',
  ENVIRONMENT: process.env.ENVIRONMENT || 'development'
};
