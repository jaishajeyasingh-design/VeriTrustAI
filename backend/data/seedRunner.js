const Application = require('../models/Application');
const Document = require('../models/Document');
const Finding = require('../models/Finding');
const Rule = require('../models/Rule');
const Report = require('../models/Report');
const AuditEvent = require('../models/AuditEvent');
const {
  SEED_RULES,
  SEED_DOCUMENTS,
  SEED_FINDINGS,
  SEED_APPLICATIONS,
  SEED_AUDIT,
  SEED_REPORTS
} = require('./seedData');

const seedDatabase = async () => {
  try {
    // 1. Rules
    const rulesCount = await Rule.countDocuments();
    if (rulesCount === 0) {
      await Rule.insertMany(SEED_RULES);
      console.log(`[Seed] Seeded ${SEED_RULES.length} compliance rules.`);
    }

    // 2. Applications
    const appCount = await Application.countDocuments();
    if (appCount === 0) {
      await Application.insertMany(SEED_APPLICATIONS);
      console.log(`[Seed] Seeded ${SEED_APPLICATIONS.length} applications.`);
    }

    // 3. Documents
    const docCount = await Document.countDocuments();
    if (docCount === 0) {
      await Document.insertMany(SEED_DOCUMENTS);
      console.log(`[Seed] Seeded ${SEED_DOCUMENTS.length} document records.`);
    }

    // 4. Findings
    const findingCount = await Finding.countDocuments();
    if (findingCount === 0) {
      await Finding.insertMany(SEED_FINDINGS);
      console.log(`[Seed] Seeded ${SEED_FINDINGS.length} verification findings.`);
    }

    // 5. Audit Events
    const auditCount = await AuditEvent.countDocuments();
    if (auditCount === 0) {
      await AuditEvent.insertMany(SEED_AUDIT);
      console.log(`[Seed] Seeded ${SEED_AUDIT.length} audit trail events.`);
    }

    // 6. Reports
    const reportCount = await Report.countDocuments();
    if (reportCount === 0) {
      await Report.insertMany(SEED_REPORTS);
      console.log(`[Seed] Seeded ${SEED_REPORTS.length} verification reports.`);
    }
  } catch (err) {
    console.error(`[Seed] Error seeding database: ${err.message}`);
  }
};

module.exports = {
  seedDatabase
};
