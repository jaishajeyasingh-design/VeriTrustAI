const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { requireRole } = require('../middleware/authMiddleware');

// List and create applications
router.get('/', applicationController.listApplications);
router.post('/', applicationController.createApplication);

// Validation endpoints
router.post('/:id/validate', applicationController.validateApplication);
router.get('/:id/findings', applicationController.getFindings);
router.get('/:id/validation-summary', applicationController.getValidationSummary);
router.patch('/:id/findings/:findingId/review', applicationController.reviewFinding);

// Status and details
router.patch('/:id/status', applicationController.updateApplicationStatus);
router.get('/:id', applicationController.getApplication);
router.delete('/:id', requireRole(['administrator']), applicationController.deleteApplication);

module.exports = router;
