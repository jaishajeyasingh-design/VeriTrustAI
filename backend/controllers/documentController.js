const fs = require('fs');
const path = require('path');
const Document = require('../models/Document');
const Application = require('../models/Application');
const ocrService = require('../services/ocrService');
const auditService = require('../services/auditService');

const listDocuments = async (req, res, next) => {
  try {
    const { type, application_id } = req.query;
    const query = {};

    if (type && type !== 'All') {
      query.type = type;
    }
    if (application_id) {
      query.applicationId = new RegExp(`^${application_id}$`, 'i');
    }

    const docs = await Document.find(query).sort({ createdAt: -1, id: -1 });
    res.json(docs.map(d => d.toJSON()));
  } catch (error) {
    next(error);
  }
};

const getDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Document.findOne({ id: new RegExp(`^${id}$`, 'i') });
    if (!doc) {
      return res.status(404).json({ detail: `Document '${id}' not found.` });
    }
    res.json(doc.toJSON());
  } catch (error) {
    next(error);
  }
};

const getDocumentOcr = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Document.findOne({ id: new RegExp(`^${id}$`, 'i') });
    if (!doc) {
      return res.status(404).json({ detail: `Document '${id}' not found.` });
    }

    const ocrResult = await ocrService.extractText(
      doc.id,
      doc.name,
      doc.storagePath || '',
      doc.fileFormat
    );

    // Merge existing extracted fields if present
    if (doc.extractedFields) {
      const existing = doc.extractedFields instanceof Map ? Object.fromEntries(doc.extractedFields) : doc.extractedFields;
      ocrResult.normalized_fields = { ...existing, ...ocrResult.normalized_fields };
    }

    res.json(ocrResult);
  } catch (error) {
    next(error);
  }
};

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No file provided for upload.' });
    }

    const { application_id, doc_type = 'Application' } = req.body;
    if (!application_id) {
      return res.status(400).json({ detail: 'application_id is required.' });
    }

    const app = await Application.findOne({ id: new RegExp(`^${application_id}$`, 'i') });
    if (!app) {
      return res.status(404).json({ detail: `Application '${application_id}' does not exist.` });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const fileFormat = ext === '.pdf' ? 'PDF' : (ext === '.png' ? 'PNG' : 'JPG');
    const docId = `DOC-${Math.floor(Math.random() * 9000) + 1000}`;
    const sizeMb = (req.file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = `${sizeMb} MB`;

    const now = new Date();
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const uploadedDate = `${String(now.getDate()).padStart(2, '0')}-${months[now.getMonth()]}-${String(now.getFullYear()).slice(-2)}`;

    // Run OCR / extraction
    const ocrResult = await ocrService.extractText(docId, req.file.originalname, req.file.path, fileFormat);

    const doc = new Document({
      id: docId,
      applicationId: app.id,
      name: req.file.originalname,
      type: doc_type,
      size: sizeStr,
      uploadedDate,
      status: 'Processed',
      ocrStatus: ocrResult.processing_errors.length > 0 ? 'Flagged' : 'Completed',
      fileFormat,
      storagePath: req.file.path,
      rawText: ocrResult.raw_text,
      extractionMethod: ocrResult.extraction_method,
      extractedFields: ocrResult.normalized_fields,
      authenticityScore: 97.4,
      pageCount: ocrResult.page_count,
      ocrEngineAvailable: true,
      processingErrors: ocrResult.processing_errors,
      demo_mode: false
    });

    await doc.save();

    // Update application documents count
    const totalDocs = await Document.countDocuments({ applicationId: new RegExp(`^${app.id}$`, 'i') });
    app.documentsCount = totalDocs;
    await app.save();

    await auditService.logEvent({
      action: 'Document Uploaded',
      applicationId: app.id,
      details: `Document '${doc.name}' (${doc.id}) uploaded and statutory text extracted.`,
      user: 'Compliance Reviewer',
      userRole: req.userRole || 'reviewer'
    });

    res.status(201).json(doc.toJSON());
  } catch (error) {
    next(error);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const doc = await Document.findOne({ id: new RegExp(`^${id}$`, 'i') });
    if (!doc) {
      return res.status(404).json({ detail: `Document '${id}' not found.` });
    }

    if (doc.storagePath && fs.existsSync(doc.storagePath)) {
      try {
        fs.unlinkSync(doc.storagePath);
      } catch (_) {}
    }

    const appId = doc.applicationId;
    await Document.deleteOne({ id: doc.id });

    // Update application count
    const totalDocs = await Document.countDocuments({ applicationId: new RegExp(`^${appId}$`, 'i') });
    await Application.updateOne({ id: appId }, { documentsCount: totalDocs });

    await auditService.logEvent({
      action: 'Document Deleted',
      applicationId: appId,
      details: `Document '${doc.name}' (${doc.id}) was permanently removed.`,
      user: 'Compliance Reviewer',
      userRole: req.userRole || 'reviewer'
    });

    res.json({ success: true, message: `Document '${id}' deleted successfully.` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listDocuments,
  getDocument,
  getDocumentOcr,
  uploadDocument,
  deleteDocument
};
