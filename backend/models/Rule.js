const mongoose = require('mongoose');

const RuleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  category: { 
    type: String, 
    enum: ['General', 'Data Check', 'Document', 'Field Validation', 'Jurisdiction'],
    required: true,
    index: true 
  },
  description: { type: String, required: true },
  severity: { 
    type: String, 
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium' 
  },
  enabled: { type: Boolean, default: true, index: true },
  affectedFields: [{ type: String }],
  lastTriggered: { type: String, default: null }
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

module.exports = mongoose.model('Rule', RuleSchema);
