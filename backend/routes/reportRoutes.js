const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');

router.get('/', reportController.listReports);
router.post('/generate', reportController.generateReport);
router.get('/:id/download', reportController.downloadReport);
router.get('/:id', reportController.getReport);

module.exports = router;
