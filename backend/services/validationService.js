const Application = require('../models/Application');
const Document = require('../models/Document');
const Finding = require('../models/Finding');
const Rule = require('../models/Rule');
const auditService = require('./auditService');

class CrossDocumentComparator {
  static normalizeString(val) {
    if (!val) return '';
    return val.toLowerCase().replace(/[\s\-_/.]+/g, ' ').trim();
  }

  static compareRegistrationNumbers(reg1, reg2) {
    if (!reg1 && !reg2) {
      return { category: 'missing_value', message: 'Registration number is missing or unextracted from both documents.' };
    }
    if (!reg1 || !reg2) {
      const present = reg1 || reg2;
      return { category: 'uncomparable', message: `Registration number is present in one document ('${present}') but unextracted in the other.` };
    }

    const clean1 = reg1.replace(/[\s\-_/]/g, '').toUpperCase();
    const clean2 = reg2.replace(/[\s\-_/]/g, '').toUpperCase();

    if (clean1 === clean2) {
      return { category: 'exact_match', message: `Registration numbers match exactly ('${reg1}').` };
    } else {
      return { category: 'mismatch', message: `Registration number Mismatch detected: Source is '${reg1}' while Compared document records '${reg2}'.` };
    }
  }

  static compareInstitutionNames(name1, name2) {
    if (!name1 && !name2) {
      return { category: 'missing_value', message: 'Institution name is unextracted from both documents.' };
    }
    if (!name1 || !name2) {
      const present = name1 || name2;
      return { category: 'uncomparable', message: `Institution name is present in one record ('${present}') but missing in the other.` };
    }

    const n1 = this.normalizeString(name1);
    const n2 = this.normalizeString(name2);

    if (n1 === n2) {
      return { category: 'exact_match', message: 'Institution names match identically.' };
    }

    const abbrMap = {
      '&': 'and',
      'tech': 'technology',
      'engg': 'engineering',
      'inst': 'institute',
      'poly': 'polytechnic',
      'univ': 'university',
      'soc': 'society'
    };

    const words1 = n1.split(' ').map(w => abbrMap[w] || w);
    const words2 = n2.split(' ').map(w => abbrMap[w] || w);

    const generics = new Set(['college', 'institute', 'of', 'and', 'the', 'for', 'technology', 'engineering', 'sciences']);
    const core1 = new Set(words1.filter(w => !generics.has(w)));
    const core2 = new Set(words2.filter(w => !generics.has(w)));

    if (core1.size > 0 && core2.size > 0 && Array.from(core1).sort().join(' ') === Array.from(core2).sort().join(' ')) {
      return { category: 'match_with_tolerance', message: `Institution names match with minor abbreviation differences ('${name1}' vs '${name2}').` };
    }

    const s1 = new Set(words1);
    const s2 = new Set(words2);
    const intersection = [...s1].filter(x => s2.has(x));
    const union = new Set([...s1, ...s2]);
    const similarity = union.size ? intersection.length / union.size : 0;

    if (similarity >= 0.7) {
      return { category: 'match_with_tolerance', message: `Acceptable linguistic match (Similarity: ${Math.round(similarity * 100)}%).` };
    } else {
      return { category: 'mismatch', message: `Institution names differ: '${name1}' does not match '${name2}'.` };
    }
  }
}

class ValidationService {
  async getFindingsForApplication(applicationId) {
    const findings = await Finding.find({
      applicationId: new RegExp(`^${applicationId}$`, 'i')
    }).sort({ id: 1 });
    return findings.map(f => f.toJSON());
  }

  async updateFindingReview(applicationId, findingId, statusUpdate, reviewerNotes = null, reviewerName = 'Compliance Reviewer') {
    const finding = await Finding.findOne({
      id: new RegExp(`^${findingId}$`, 'i'),
      applicationId: new RegExp(`^${applicationId}$`, 'i')
    });

    if (!finding) {
      const err = new Error(`Finding '${findingId}' not found for application '${applicationId}'.`);
      err.status = 404;
      throw err;
    }

    finding.reviewStatus = statusUpdate;
    if (reviewerNotes !== null && reviewerNotes !== undefined) {
      finding.reviewerNotes = reviewerNotes;
    }
    finding.reviewedBy = reviewerName;
    finding.reviewedAt = new Date().toISOString();
    await finding.save();

    await auditService.logEvent({
      action: 'Finding Reviewed',
      applicationId,
      details: `Finding '${finding.title}' review updated to '${statusUpdate}' by ${reviewerName}. Notes: ${reviewerNotes || 'None'}`,
      user: reviewerName,
      userRole: 'reviewer'
    });

    return finding.toJSON();
  }

  async validateApplication(applicationId) {
    const app = await Application.findOne({ id: new RegExp(`^${applicationId}$`, 'i') });
    if (!app) {
      const err = new Error(`Application '${applicationId}' does not exist.`);
      err.status = 404;
      throw err;
    }

    const documents = await Document.find({ applicationId: new RegExp(`^${applicationId}$`, 'i') });
    const enabledRules = await Rule.find({ enabled: true });
    const enabledRuleMap = new Map(enabledRules.map(r => [r.id, r]));

    const generatedFindings = [];

    // Find key documents
    const appDoc = documents.find(d => d.type === 'Application');
    const certDoc = documents.find(d => d.type === 'Certificate');
    const nocDoc = documents.find(d => d.type === 'NOC');

    const appFields = appDoc ? (appDoc.extractedFields instanceof Map ? Object.fromEntries(appDoc.extractedFields) : (appDoc.extractedFields || {})) : {};
    const certFields = certDoc ? (certDoc.extractedFields instanceof Map ? Object.fromEntries(certDoc.extractedFields) : (certDoc.extractedFields || {})) : {};
    const nocFields = nocDoc ? (nocDoc.extractedFields instanceof Map ? Object.fromEntries(nocDoc.extractedFields) : (nocDoc.extractedFields || {})) : {};

    const makeId = (suffix) => `FIND-${Date.now().toString(36).toUpperCase()}-${suffix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Rule R007: Registration Number Mismatch
    if (enabledRuleMap.has('R007') && appDoc && certDoc) {
      const formReg = appFields['Registration Number'] || appFields['Application ID'] || '';
      const certReg = certFields['Registration Number'] || certFields['Certificate ID'] || '';

      if (formReg && certReg) {
        const comp = CrossDocumentComparator.compareRegistrationNumbers(formReg, certReg);
        if (comp.category === 'mismatch') {
          generatedFindings.push({
            id: makeId('REG'),
            applicationId: app.id,
            ruleId: 'R007',
            title: 'Registration Number Mismatch',
            severity: 'High',
            category: 'Mismatch',
            description: comp.message,
            fieldName: 'Registration Number',
            sourceDoc: appDoc.name,
            sourceDocId: appDoc.id,
            fieldA: 'Registration Number (Form)',
            valueA: formReg,
            comparedDoc: certDoc.name,
            comparedDocId: certDoc.id,
            fieldB: 'Registration Number (Certificate)',
            valueB: certReg,
            comparisonResult: comp.message,
            evidenceReferences: [`${appDoc.name}: Section 1.2`, `${certDoc.name}: Header`],
            recommendation: 'Request official clarifying affidavit or verify against State Portal Registry records.',
            reviewStatus: 'Pending'
          });
        }
      }
    }

    // Rule R002: Applicant Name Mismatch
    if (enabledRuleMap.has('R002') && appDoc && certDoc) {
      const formName = appFields['Applicant Legal Name'] || appFields['Institution Name'] || app.applicantName;
      const certName = certFields['Issued Name'] || certFields['Institution Name'] || '';

      if (formName && certName) {
        const comp = CrossDocumentComparator.compareInstitutionNames(formName, certName);
        if (comp.category === 'mismatch' || comp.category === 'match_with_tolerance') {
          generatedFindings.push({
            id: makeId('NAME'),
            applicationId: app.id,
            ruleId: 'R002',
            title: comp.category === 'mismatch' ? 'Institution Legal Name Mismatch' : 'Institution Legal Name Slight Deviation',
            severity: comp.category === 'mismatch' ? 'High' : 'Medium',
            category: 'Mismatch',
            description: comp.message,
            fieldName: 'Institution Name',
            sourceDoc: appDoc.name,
            sourceDocId: appDoc.id,
            fieldA: 'Institution Name (Form)',
            valueA: formName,
            comparedDoc: certDoc.name,
            comparedDocId: certDoc.id,
            fieldB: 'Certificate Name',
            valueB: certName,
            comparisonResult: comp.message,
            evidenceReferences: [`${appDoc.name}: Header`, `${certDoc.name}: Line 3`],
            recommendation: 'Check whether a formal gazette name change amendment was appended.',
            reviewStatus: 'Pending'
          });
        }
      }
    }

    // Rule R004: Expired or Expiring Document
    if (enabledRuleMap.has('R004') && nocDoc) {
      const validityStr = nocFields['Validity Period'] || '';
      if (/expires in|expiring|renewal required/i.test(validityStr)) {
        generatedFindings.push({
          id: makeId('EXP'),
          applicationId: app.id,
          ruleId: 'R004',
          title: 'Fire Safety NOC Approaching Expiry',
          severity: 'Warning',
          category: 'Validity',
          description: `Fire & Rescue Services clearance certificate: ${validityStr}`,
          fieldName: 'Validity Period',
          sourceDoc: nocDoc.name,
          sourceDocId: nocDoc.id,
          fieldA: 'Expiration Window',
          valueA: validityStr,
          recommendation: 'Require applicant to provide receipt of renewal application before granting final clearance.',
          reviewStatus: 'Pending'
        });
      }
    }

    // Rule R001: Required Document Missing
    if (enabledRuleMap.has('R001')) {
      const docTypesPresent = new Set(documents.map(d => d.type));
      const requiredTypes = ['Application', 'Certificate'];
      for (const req of requiredTypes) {
        if (!docTypesPresent.has(req)) {
          generatedFindings.push({
            id: makeId(`MIS-${req.substring(0, 3).toUpperCase()}`),
            applicationId: app.id,
            ruleId: 'R001',
            title: `Mandatory Document Missing: ${req}`,
            severity: 'High',
            category: 'Missing Document',
            description: `Statutory verification requires a valid '${req}' document to be submitted.`,
            fieldName: 'Document Set',
            recommendation: `Request the applicant to upload the missing ${req} document immediately.`,
            reviewStatus: 'Pending'
          });
        }
      }
    }

    // Clear old findings if we have new generated findings
    if (generatedFindings.length > 0) {
      await Finding.deleteMany({ applicationId: new RegExp(`^${app.id}$`, 'i') });
      await Finding.insertMany(generatedFindings);
    }

    // Fetch active findings
    const allFindings = await Finding.find({ applicationId: new RegExp(`^${app.id}$`, 'i') });

    // Calculate score & counts
    let highCount = 0;
    let warningCount = 0;
    let infoCount = 0;

    for (const f of allFindings) {
      if (f.reviewStatus === 'Dismissed' || f.reviewStatus === 'False_Positive') continue;
      if (f.severity === 'High') highCount++;
      else if (f.severity === 'Warning' || f.severity === 'Medium') warningCount++;
      else infoCount++;
    }

    let calculatedScore = 100 - (highCount * 15) - (warningCount * 5);
    calculatedScore = Math.max(20, Math.min(100, calculatedScore));

    let newStatus = app.status;
    let riskLevel = 'Low';
    if (highCount >= 2 || calculatedScore < 70) {
      newStatus = 'Needs Review';
      riskLevel = 'High';
    } else if (highCount === 1 || warningCount >= 2) {
      newStatus = 'Needs Review';
      riskLevel = 'Medium';
    } else if (highCount === 0 && warningCount === 0) {
      newStatus = 'Verified';
      riskLevel = 'Low';
    }

    app.complianceScore = calculatedScore;
    app.findingsCount = { high: highCount, warning: warningCount, info: infoCount };
    app.status = newStatus;
    app.riskLevel = riskLevel;
    app.lastUpdated = new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true });
    
    app.timeline.push({
      step: 'Automated Regulatory Cross-Check',
      timestamp: app.lastUpdated,
      status: 'completed',
      details: `Validation engine evaluated ${enabledRules.length} rules. Compliance score: ${calculatedScore}% (${highCount} critical issues detected).`
    });

    await app.save();

    await auditService.logEvent({
      action: 'Automated Cross-Check',
      applicationId: app.id,
      details: `Cross-document regulatory validation completed. Found ${allFindings.length} findings, compliance score: ${calculatedScore}%. Status: ${newStatus}.`,
      user: 'VeriTrust AI Rules Engine',
      userRole: 'System'
    });

    return {
      application_id: app.id,
      status: app.status,
      compliance_score: app.complianceScore,
      risk_level: app.riskLevel,
      findings_count: app.findingsCount,
      findings: allFindings.map(f => f.toJSON()),
      rules_evaluated: enabledRules.length,
      rules_triggered: allFindings.length,
      documents_analyzed: documents.length,
      validation_timestamp: new Date().toISOString(),
      disclaimer: 'Automated regulatory cross-check based on active compliance rules.'
    };
  }
}

module.exports = new ValidationService();
