const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  applicationId: { type: String, required: true, index: true },
  applicantName: { type: String, required: true },
  generatedDate: { type: String, required: true },
  findingsCount: { type: Number, default: 0 },
  complianceScore: { type: Number, default: 100 },
  status: { 
    type: String, 
    enum: ['Needs Review', 'Verified', 'Pending', 'Rejected', 'Processing'],
    default: 'Needs Review' 
  },
  summary: { type: String, required: true },
  verifiedBy: { type: String, default: 'VeriTrust AI Compliance Engine v3.2 (MERN Edition)' },
  downloadUrl: { type: String, default: null },
  filePath: { type: String, default: null },
  auditHash: { type: String, default: null }
}, {
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

module.exports = mongoose.model('Report', ReportSchema);
