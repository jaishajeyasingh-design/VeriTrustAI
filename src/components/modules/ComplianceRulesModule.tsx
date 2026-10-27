import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  CheckCircle2,
  AlertTriangle,
  Play,
  Edit2,
  Check,
  Sparkles,
  ShieldAlert,
  Lock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PriorityBadge } from '../common/PriorityBadge';
import { Modal } from '../common/Modal';
import { DemoDisclaimer } from '../common/DemoDisclaimer';
import type { ComplianceRule, PriorityLevel } from '../../types';

export const ComplianceRulesModule: React.FC = () => {
  const { rules, toggleRule, addRule, showToast, currentRole } = useApp();
  const navigate = useNavigate();

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [testModalRule, setTestModalRule] = useState<ComplianceRule | null>(null);

  // New Rule Form
  const [ruleName, setRuleName] = useState('');
  const [ruleCat, setRuleCat] = useState<ComplianceRule['category']>('General');
  const [ruleSeverity, setRuleSeverity] = useState<PriorityLevel>('High');
  const [ruleDesc, setRuleDesc] = useState('');
  const [ruleFields, setRuleFields] = useState('Applicant Name, Registration ID');

  const handleAddRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newId = `R00${rules.length + 1}`;
    const newRule: ComplianceRule = {
      id: newId,
      name: ruleName,
      category: ruleCat,
      severity: ruleSeverity,
      description: ruleDesc,
      enabled: true,
      affectedFields: ruleFields.split(',').map((s) => s.trim())
    };
    addRule(newRule);
    setAddModalOpen(false);
    setRuleName('');
    setRuleDesc('');
  };

  // If applicant, restrict access
  if (currentRole === 'applicant') {
    return (
      <div className="space-y-6">
        <DemoDisclaimer variant="banner" moduleName="Compliance Rules Engine" />
        <div className="bg-white p-10 rounded-2xl border border-slate-200/80 shadow-xs text-center max-w-xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Restricted Access Module</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              The Statutory Compliance Rules Matrix is reserved for Regulatory Reviewers and System Administrators. Institutional applicants do not have privileges to view or reconfigure internal audit algorithms.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => navigate('/applications')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Return to My Applications →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Demo Disclaimer */}
      <DemoDisclaimer variant="banner" moduleName="Compliance Rules Engine" />

      {/* Reviewer Read-only Info Banner */}
      {currentRole === 'reviewer' && (
        <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs flex items-center justify-between text-blue-900">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Read-Only Mode:</strong> Reviewers can inspect the statutory matrix. Rule toggling and parameter adjustments require Administrator permissions.
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Compliance Rules {currentRole === 'reviewer' ? '(Read-Only Matrix)' : '(Governance)'}
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-mono">
              v2.4 Matrix
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {currentRole === 'reviewer'
              ? 'Inspect verification rules, statutory constraints, and tolerance thresholds for regulatory cross-checking.'
              : 'Configure verification rules, statutory constraints, and tolerance thresholds for regulatory cross-checking.'}
          </p>
        </div>

        {currentRole === 'administrator' && (
          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rule</span>
          </button>
        )}
      </div>

      {/* Rules Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs">Total Active Rules</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {rules.filter((r) => r.enabled).length} of {rules.length}
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Check className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs">High Severity Constraints</span>
            <div className="text-xl font-bold text-rose-600 mt-0.5">
              {rules.filter((r) => r.severity === 'High').length} Rules
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-slate-500 text-xs">Simulated Evaluation Time</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">~140 ms / Dossier</div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Rules Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                <th className="py-3 px-4">Rule ID</th>
                <th className="py-3 px-4">Rule Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {rules.map((rule) => (
                <tr
                  key={rule.id}
                  className="hover:bg-slate-50/80 transition-colors group"
                >
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-600">
                    {rule.id}
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-900">{rule.name}</p>
                    <p className="text-[11px] text-slate-400 line-clamp-1 max-w-md">
                      {rule.description}
                    </p>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium">
                      {rule.category}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <PriorityBadge priority={rule.severity} size="sm" />
                  </td>

                  {/* Toggle Switch */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={currentRole !== 'administrator'}
                        onClick={() => toggleRule(rule.id)}
                        title={currentRole !== 'administrator' ? 'Modifying rules requires Administrator privileges' : 'Toggle rule active status'}
                        className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                          currentRole !== 'administrator' ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                        } ${
                          rule.enabled ? 'bg-blue-600' : 'bg-slate-300'
                        }`}
                        aria-label="Toggle rule status"
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                            rule.enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span
                        className={`text-[11px] font-semibold ${
                          rule.enabled ? 'text-blue-700' : 'text-slate-400'
                        }`}
                      >
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setTestModalRule(rule)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3" />
                        <span>Test</span>
                      </button>
                      {currentRole === 'administrator' && (
                        <button
                          onClick={() => showToast(`Editing configuration for ${rule.id}`)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                          title="Edit Rule"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Rule */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="Configure New Compliance Rule"
        subtitle="Define regulatory constraint logic for cross-document validation"
      >
        <form onSubmit={handleAddRuleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Rule Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Land Title Deed encumbrance clause check"
              value={ruleName}
              onChange={(e) => setRuleName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={ruleCat}
                onChange={(e) => setRuleCat(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              >
                <option value="General">General</option>
                <option value="Data Check">Data Check</option>
                <option value="Document">Document</option>
                <option value="Field Validation">Field Validation</option>
                <option value="Jurisdiction">Jurisdiction</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Severity</label>
              <select
                value={ruleSeverity}
                onChange={(e) => setRuleSeverity(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              required
              placeholder="Explain what discrepancy this rule flags and how to resolve it..."
              value={ruleDesc}
              onChange={(e) => setRuleDesc(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Affected Fields (Comma separated)</label>
            <input
              type="text"
              value={ruleFields}
              onChange={(e) => setRuleFields(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-xs"
            >
              Save Rule Configuration
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Test Rule */}
      {testModalRule && (
        <Modal
          isOpen={!!testModalRule}
          onClose={() => setTestModalRule(null)}
          title={`Simulate Rule Evaluation: ${testModalRule.id}`}
          subtitle={testModalRule.name}
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-slate-800">Rule Logic Criteria:</span>
              <p className="text-slate-600">{testModalRule.description}</p>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="font-bold">Evaluation Passed against Test Dataset (14 Records)</span>
              </div>
              <span className="text-[10px] bg-emerald-200 font-mono font-bold px-1.5 py-0.5 rounded">
                0 Errors
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setTestModalRule(null)}
                className="px-4 py-2 bg-slate-900 text-white font-semibold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
