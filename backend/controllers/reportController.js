const reportService = require('../services/reportService');

const listReports = async (req, res, next) => {
  try {
    const reports = await reportService.listReports();
    res.json(reports);
  } catch (error) {
    next(error);
  }
};

const getReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const report = await reportService.getReport(id);
    if (!report) {
      return res.status(404).json({ detail: `Report '${id}' not found.` });
    }
    res.json(report);
  } catch (error) {
    next(error);
  }
};

const generateReport = async (req, res, next) => {
  try {
    const applicationId = req.query.application_id || req.body.applicationId || req.body.application_id;
    if (!applicationId) {
      return res.status(400).json({ detail: 'application_id parameter is required.' });
    }
    const report = await reportService.generateReport(applicationId);
    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
};

const downloadReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    await reportService.streamReportPdf(id, res);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listReports,
  getReport,
  generateReport,
  downloadReport
};
