const express = require('express');
const router = express.Router();
const ruleController = require('../controllers/ruleController');
const { requireRole } = require('../middleware/authMiddleware');

router.get('/', ruleController.listRules);
router.post('/test', ruleController.testRules);
router.patch('/:id/toggle', requireRole(['administrator', 'reviewer']), ruleController.toggleRule);

module.exports = router;
