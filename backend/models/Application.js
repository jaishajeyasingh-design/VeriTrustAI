const mongoose = require('mongoose');

const TimelineItemSchema = new mongoose.Schema({
  step: { type: String, required: true },
  timestamp: { type: String, required: true },
  status: { type: String, enum: ['completed', 'current', 'pending'], default: 'completed' },
  details: { type: String, default: '' }
}, { _id: false });

const FindingsCountSchema = new mongoose.Schema({
  high: { type: Number, default: 0 },
  warning: { type: Number, default: 0 },
  info: { type: Number, default: 0 }
}, { _id: false });

const ApplicationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  applicantName: { type: String, required: true, index: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['Institutional', 'Affiliation', 'Extension', 'Accreditation'],
    default: 'Institutional',
    index: true 
  },
  category: { type: String, required: true },
  referenceNo: { type: String, required: true, index: true },
  submittedDate: { type: String, required: true },
  lastUpdated: { type: String, required: true },
  documentsCount: { type: Number, default: 0 },
  status: { 
    type: String, 
    required: true, 
    enum: ['Needs Review', 'Verified', 'Pending', 'Rejected', 'Processing'],
    default: 'Needs Review',
    index: true 
  },
  priority: { 
    type: String, 
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium',
    index: true 
  },
  riskLevel: { 
    type: String, 
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium' 
  },
  assignedReviewer: { type: String, default: 'Compliance Reviewer' },
  contactEmail: { type: String, default: '' },
  contactPhone: { type: String, default: '' },
  complianceScore: { type: Number, default: 85 },
  findingsCount: { type: FindingsCountSchema, default: () => ({ high: 0, warning: 0, info: 0 }) },
  timeline: [TimelineItemSchema]
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

module.exports = mongoose.model('Application', ApplicationSchema);
