const Application = require('../models/Application');
const Document = require('../models/Document');
const Finding = require('../models/Finding');
const Report = require('../models/Report');
const validationService = require('../services/validationService');
const auditService = require('../services/auditService');

const listApplications = async (req, res, next) => {
  try {
    const { search, status, type, priority, skip = 0, limit = 50 } = req.query;
    const query = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { applicantName: regex },
        { title: regex },
        { referenceNo: regex },
        { id: regex }
      ];
    }

    if (status && status !== 'All') {
      query.status = status;
    }
    if (type && type !== 'All') {
      query.type = type;
    }
    if (priority && priority !== 'All') {
      query.priority = priority;
    }

    const total = await Application.countDocuments(query);
    const applications = await Application.find(query)
      .sort({ createdAt: -1, id: -1 })
      .skip(parseInt(skip, 10))
      .limit(parseInt(limit, 10));

    // Populate documents and findings for each application
    const items = await Promise.all(applications.map(async (app) => {
      const appObj = app.toJSON();
      const docs = await Document.find({ applicationId: new RegExp(`^${app.id}$`, 'i') });
      const fnds = await Finding.find({ applicationId: new RegExp(`^${app.id}$`, 'i') });
      appObj.documents = docs.map(d => d.toJSON());
      appObj.findings = fnds.map(f => f.toJSON());
      appObj.documentsCount = docs.length;
      return appObj;
    }));

    res.json({
      items,
      total,
      skip: parseInt(skip, 10),
      limit: parseInt(limit, 10)
    });
  } catch (error) {
    next(error);
  }
};

const getApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const app = await Application.findOne({ id: new RegExp(`^${id}$`, 'i') });
    if (!app) {
      return res.status(404).json({ detail: `Application '${id}' does not exist.` });
    }

    const appObj = app.toJSON();
    const docs = await Document.find({ applicationId: new RegExp(`^${app.id}$`, 'i') });
    const fnds = await Finding.find({ applicationId: new RegExp(`^${app.id}$`, 'i') });
    appObj.documents = docs.map(d => d.toJSON());
    appObj.findings = fnds.map(f => f.toJSON());
    appObj.documentsCount = docs.length;

    res.json(appObj);
  } catch (error) {
    next(error);
  }
};

const createApplication = async (req, res, next) => {
  try {
    const data = req.body;
    const now = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const submittedDate = `${String(now.getDate()).padStart(2, '0')}-${months[now.getMonth()]}-${String(now.getFullYear()).slice(-2)}`;
    const lastUpdated = `${submittedDate} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

    const id = data.id || `APP2026${String(Math.floor(Math.random() * 900) + 100)}`;
    const referenceNo = data.referenceNo || `AICTE/APP/2026/${Math.floor(Math.random() * 9000) + 1000}`;

    const newApp = new Application({
      id,
      title: data.title || `${data.applicantName || 'Institutional'} Approval Application`,
      applicantName: data.applicantName || 'New Institutional Applicant',
      type: data.type || 'Institutional',
      category: data.category || 'Institutional Approval',
      referenceNo,
      submittedDate,
      lastUpdated,
      documentsCount: 0,
      status: 'Needs Review',
      priority: data.priority || 'Medium',
      riskLevel: data.riskLevel || 'Medium',
      assignedReviewer: data.assignedReviewer || 'Compliance Reviewer',
      contactEmail: data.contactEmail || '',
      contactPhone: data.contactPhone || '',
      complianceScore: 85,
      findingsCount: { high: 0, warning: 0, info: 0 },
      timeline: [
        {
          step: 'Application Submitted',
          timestamp: lastUpdated,
          status: 'completed',
          details: 'Application dossier created in VeriTrust AI Platform'
        }
      ]
    });

    await newApp.save();

    await auditService.logEvent({
      action: 'Application Created',
      applicationId: newApp.id,
      details: `New application '${newApp.applicantName}' (${newApp.id}) submitted. Reference: ${newApp.referenceNo}.`,
      user: req.userRole === 'applicant' ? newApp.applicantName : 'Applicant Portal',
      userRole: req.userRole || 'applicant'
    });

    const appObj = newApp.toJSON();
    appObj.documents = [];
    appObj.findings = [];
    res.status(201).json(appObj);
  } catch (error) {
    next(error);
  }
};

const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reviewerName = 'Compliance Reviewer', notes = '' } = req.body;

    const app = await Application.findOne({ id: new RegExp(`^${id}$`, 'i') });
    if (!app) {
      return res.status(404).json({ detail: `Application '${id}' does not exist.` });
    }

    const previousStatus = app.status;
    app.status = status;
    const now = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    app.lastUpdated = `${String(now.getDate()).padStart(2, '0')}-${months[now.getMonth()]}-${String(now.getFullYear()).slice(-2)} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;

    app.timeline.push({
      step: `Status Changed to ${status}`,
      timestamp: app.lastUpdated,
      status: 'completed',
      details: `Updated by ${reviewerName}. Notes: ${notes || 'No remarks provided.'}`
    });

    await app.save();

    await auditService.logEvent({
      action: 'Status Updated',
      applicationId: app.id,
      details: `Application status moved from '${previousStatus}' to '${status}' by ${reviewerName}. Notes: ${notes || 'None'}`,
      user: reviewerName,
      userRole: req.userRole || 'reviewer'
    });

    const appObj = app.toJSON();
    const docs = await Document.find({ applicationId: new RegExp(`^${app.id}$`, 'i') });
    const fnds = await Finding.find({ applicationId: new RegExp(`^${app.id}$`, 'i') });
    appObj.documents = docs.map(d => d.toJSON());
    appObj.findings = fnds.map(f => f.toJSON());
    appObj.documentsCount = docs.length;

    res.json(appObj);
  } catch (error) {
    next(error);
  }
};

const deleteApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const app = await Application.findOne({ id: new RegExp(`^${id}$`, 'i') });
    if (!app) {
      return res.status(404).json({ detail: `Application '${id}' does not exist.` });
    }

    await Application.deleteOne({ id: app.id });
    await Document.deleteMany({ applicationId: new RegExp(`^${app.id}$`, 'i') });
    await Finding.deleteMany({ applicationId: new RegExp(`^${app.id}$`, 'i') });
    await Report.deleteMany({ applicationId: new RegExp(`^${app.id}$`, 'i') });

    await auditService.logEvent({
      action: 'Application Deleted',
      applicationId: app.id,
      details: `Application '${app.applicantName}' (${app.id}) and all linked records removed.`,
      user: 'Administrator',
      userRole: 'administrator'
    });

    res.json({ success: true, message: `Application ${id} deleted successfully.` });
  } catch (error) {
    next(error);
  }
};

const validateApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await validationService.validateApplication(id);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getFindings = async (req, res, next) => {
  try {
    const { id } = req.params;
    const findings = await validationService.getFindingsForApplication(id);
    res.json(findings);
  } catch (error) {
    next(error);
  }
};

const getValidationSummary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const app = await Application.findOne({ id: new RegExp(`^${id}$`, 'i') });
    if (!app) {
      return res.status(404).json({ detail: `Application '${id}' does not exist.` });
    }

    const findings = await validationService.getFindingsForApplication(id);
    res.json({
      application_id: app.id,
      status: app.status,
      compliance_score: app.complianceScore,
      risk_level: app.riskLevel,
      findings_count: app.findingsCount,
      findings,
      rules_evaluated: 7,
      rules_triggered: findings.length,
      documents_analyzed: app.documentsCount,
      validation_timestamp: new Date().toISOString(),
      disclaimer: 'Persisted verification assessment summary.'
    });
  } catch (error) {
    next(error);
  }
};

const reviewFinding = async (req, res, next) => {
  try {
    const { id, findingId } = req.params;
    const { status, reviewerNotes, reviewerName = 'Compliance Reviewer' } = req.body;

    const updated = await validationService.updateFindingReview(id, findingId, status, reviewerNotes, reviewerName);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listApplications,
  getApplication,
  createApplication,
  updateApplicationStatus,
  deleteApplication,
  validateApplication,
  getFindings,
  getValidationSummary,
  reviewFinding
};
