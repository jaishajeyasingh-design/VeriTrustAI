const mongoose = require('mongoose');

const AuditEventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  timestamp: { type: String, required: true },
  user: { type: String, required: true },
  userRole: { 
    type: String, 
    enum: ['applicant', 'reviewer', 'administrator', 'System'],
    default: 'reviewer' 
  },
  action: { type: String, required: true, index: true },
  applicationId: { type: String, default: '', index: true },
  details: { type: String, required: true },
  prevHash: { type: String, default: null },
  hash: { type: String, required: true, index: true }
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

module.exports = mongoose.model('AuditEvent', AuditEventSchema);
