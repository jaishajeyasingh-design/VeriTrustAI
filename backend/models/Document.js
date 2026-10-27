const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  applicationId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['Application', 'Certificate', 'Affidavit', 'Identity', 'Approval', 'NOC', 'Financial'],
    default: 'Application',
    index: true
  },
  size: { type: String, required: true },
  uploadedDate: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Processed', 'Processing', 'Failed', 'Pending'],
    default: 'Processed' 
  },
  ocrStatus: { 
    type: String, 
    enum: ['Completed', 'In Progress', 'Flagged'],
    default: 'Completed' 
  },
  fileFormat: { 
    type: String, 
    enum: ['PDF', 'JPG', 'PNG'],
    required: true 
  },
  storagePath: { type: String, default: null },
  rawText: { type: String, default: '' },
  extractionMethod: { type: String, default: 'pdf_parse_native' },
  extractedFields: { type: Map, of: String, default: {} },
  authenticityScore: { type: Number, default: 95.0 },
  pageCount: { type: Number, default: 1 },
  ocrEngineAvailable: { type: Boolean, default: true },
  processingErrors: [{ type: String }],
  demo_mode: { type: Boolean, default: false }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.__v;
      if (ret.extractedFields instanceof Map) {
        ret.extractedFields = Object.fromEntries(ret.extractedFields);
      }
      return ret;
    }
  }
});

module.exports = mongoose.model('Document', DocumentSchema);
