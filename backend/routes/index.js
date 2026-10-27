const express = require('express');
const router = express.Router();

const healthRoutes = require('./healthRoutes');
const applicationRoutes = require('./applicationRoutes');
const documentRoutes = require('./documentRoutes');
const ruleRoutes = require('./ruleRoutes');
const reportRoutes = require('./reportRoutes');
const auditRoutes = require('./auditRoutes');

router.use('/health', healthRoutes);
router.use('/applications', applicationRoutes);
router.use('/documents', documentRoutes);
router.use('/rules', ruleRoutes);
router.use('/reports', reportRoutes);
router.use('/audit', auditRoutes);

module.exports = router;
