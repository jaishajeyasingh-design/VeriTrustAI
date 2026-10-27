const auditService = require('../services/auditService');

const listAuditEvents = async (req, res, next) => {
  try {
    const { application_id } = req.query;
    const events = await auditService.listEvents(application_id);
    res.json(events);
  } catch (error) {
    next(error);
  }
};

const createAuditEvent = async (req, res, next) => {
  try {
    const { action, applicationId, details, user, userRole } = req.body;
    if (!action || !details) {
      return res.status(400).json({ detail: 'action and details are required fields.' });
    }

    const event = await auditService.logEvent({
      action,
      applicationId: applicationId || '',
      details,
      user: user || req.userRole || 'Compliance Reviewer',
      userRole: userRole || req.userRole || 'reviewer'
    });

    res.status(201).json(event);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listAuditEvents,
  createAuditEvent
};
