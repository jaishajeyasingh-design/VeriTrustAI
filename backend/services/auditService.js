const crypto = require('crypto');
const AuditEvent = require('../models/AuditEvent');

class AuditService {
  computeHash(prevHash, timestamp, action, user, applicationId, details) {
    const raw = `${prevHash || 'GENESIS'}:${timestamp}:${action}:${user}:${applicationId || ''}:${details}`;
    return `sha256:${crypto.createHash('sha256').update(raw).digest('hex')}`;
  }

  async listEvents(applicationId = null) {
    const query = {};
    if (applicationId) {
      query.applicationId = new RegExp(`^${applicationId}$`, 'i');
    }
    const events = await AuditEvent.find(query).sort({ createdAt: -1, id: -1 });
    return events.map(e => e.toJSON());
  }

  async logEvent({ action, applicationId = '', details, user = 'Compliance Reviewer', userRole = 'reviewer' }) {
    // Find the latest audit event to link prevHash
    const lastEvent = await AuditEvent.findOne().sort({ createdAt: -1, id: -1 });
    const prevHash = lastEvent ? lastEvent.hash : null;
    const now = new Date();
    
    // Format timestamp like "28-Oct-26 10:34 AM"
    const day = String(now.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[now.getMonth()];
    const year = String(now.getFullYear()).slice(-2);
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const timestampStr = `${day}-${month}-${year} ${hours}:${minutes} ${ampm}`;

    const hash = this.computeHash(prevHash, timestampStr, action, user, applicationId, details);
    const id = `AUD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const event = new AuditEvent({
      id,
      timestamp: timestampStr,
      user,
      userRole,
      action,
      applicationId,
      details,
      prevHash,
      hash
    });

    await event.save();
    return event.toJSON();
  }

  async verifyChain() {
    const events = await AuditEvent.find().sort({ createdAt: 1, id: 1 });
    let previousHash = null;
    for (const ev of events) {
      const expected = this.computeHash(ev.prevHash, ev.timestamp, ev.action, ev.user, ev.applicationId, ev.details);
      if (ev.hash !== expected || ev.prevHash !== previousHash) {
        return { valid: false, brokenAt: ev.id };
      }
      previousHash = ev.hash;
    }
    return { valid: true, totalEvents: events.length };
  }
}

module.exports = new AuditService();
