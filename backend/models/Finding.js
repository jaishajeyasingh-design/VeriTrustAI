const mongoose = require('mongoose');

const FindingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  applicationId: { type: String, required: true, index: true },
  ruleId: { type: String, default: null, index: true },
  title: { type: String, required: true },
  severity: { 
    type: String, 
    enum: ['High', 'Medium', 'Low', 'Warning', 'Info'],
    required: true,
    index: true 
  },
  category: { 
    type: String, 
    enum: ['Mismatch', 'Missing Document', 'Validity', 'Compliance', 'Format'],
    required: true 
  },
  description: { type: String, required: true },
  fieldName: { type: String, default: null },
  sourceDoc: { type: String, default: null },
  sourceDocId: { type: String, default: null },
  comparedDoc: { type: String, default: null },
  comparedDocId: { type: String, default: null },
  fieldA: { type: String, default: null },
  valueA: { type: String, default: null },
  fieldB: { type: String, default: null },
  valueB: { type: String, default: null },
  comparisonResult: { type: String, default: null },
  evidenceReferences: [{ type: String }],
  recommendation: { type: String, default: null },
  reviewStatus: { 
    type: String, 
    enum: ['Pending', 'Verified_Accurate', 'False_Positive', 'Escalated', 'Reviewed', 'Dismissed', 'Resolved'],
    default: 'Pending' 
  },
  reviewerNotes: { type: String, default: null },
  reviewedBy: { type: String, default: null },
  reviewedAt: { type: String, default: null },
  timestamp: { type: String, default: () => new Date().toISOString() }
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

module.exports = mongoose.model('Finding', FindingSchema);
