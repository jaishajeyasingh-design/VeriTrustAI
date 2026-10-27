const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');

router.get('/', auditController.listAuditEvents);
router.post('/', auditController.createAuditEvent);

module.exports = router;
