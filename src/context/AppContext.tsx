import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  Application,
  DocumentItem,
  ComplianceRule,
  VerificationReport,
  AuditEvent,
  UserProfile,
  UserRole,
  ApplicationStatus
} from '../types';
import {
  initialApplications,
  initialDocuments,
  initialComplianceRules,
  initialVerificationReports,
  initialAuditTrail,
  initialUserProfile
} from '../data/mockData';
import { api } from '../services/apiClient';

interface AppContextType {
  applications: Application[];
  documents: DocumentItem[];
  rules: ComplianceRule[];
  reports: VerificationReport[];
  auditTrail: AuditEvent[];
  userProfile: UserProfile;
  currentRole: UserRole;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setCurrentRole: (role: UserRole) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  addApplication: (app: Application) => Promise<void>;
  updateApplicationStatus: (id: string, status: ApplicationStatus, notes?: string) => Promise<void>;
  addDocument: (doc: DocumentItem) => void;
  uploadDocumentFile: (file: File, applicationId: string, docType?: DocumentItem['type']) => Promise<DocumentItem>;
  deleteDocument: (id: string) => Promise<void>;
  toggleRule: (id: string) => Promise<void>;
  addRule: (rule: ComplianceRule) => void;
  addAuditEvent: (action: string, applicationId: string, details: string) => Promise<void>;
  addReport: (report: VerificationReport) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Backend Integration State
  backendConnected: boolean | null; // null = checking, true = connected, false = offline fallback
  isCheckingBackend: boolean;
  backendLatencyMs: number | null;
  isFallbackMode: boolean;
  checkBackendConnection: () => Promise<boolean>;
  refreshApplication: (id: string) => Promise<Application | undefined>;
  refreshReports: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [applications, setApplications] = useState<Application[]>(initialApplications);
  const [documents, setDocuments] = useState<DocumentItem[]>(initialDocuments);
  const [rules, setRules] = useState<ComplianceRule[]>(initialComplianceRules);
  const [reports, setReports] = useState<VerificationReport[]>(initialVerificationReports);
  const [auditTrail, setAuditTrail] = useState<AuditEvent[]>(initialAuditTrail);
  const [userProfile, setUserProfile] = useState<UserProfile>(initialUserProfile);
  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vt_active_role') as UserRole;
      if (saved && ['reviewer', 'applicant', 'administrator'].includes(saved)) {
        return saved;
      }
    }
    return 'reviewer';
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Backend Connection States
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [isCheckingBackend, setIsCheckingBackend] = useState<boolean>(false);
  const [backendLatencyMs, setBackendLatencyMs] = useState<number | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState<boolean>(true);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  // Connect to backend and load live data
  const checkBackendConnection = useCallback(async (): Promise<boolean> => {
    setIsCheckingBackend(true);
    const startTime = performance.now();
    try {
      const health = await api.health.check(3500);
      const latency = Math.round(performance.now() - startTime);
      setBackendLatencyMs(latency);

      if (health.status === 'healthy') {
        setBackendConnected(true);
        setIsFallbackMode(false);

        // Load live applications from FastAPI backend
        try {
          const appRes = await api.applications.list({ limit: 100 });
          if (appRes && appRes.items) {
            setApplications(appRes.items);
          }
        } catch (e) {
          console.warn('Could not load applications from backend, keeping cached state:', e);
        }

        // Load live audit events from FastAPI backend
        try {
          const audits = await api.audit.list();
          if (audits && audits.length > 0) {
            setAuditTrail(audits);
          }
        } catch (e) {
          console.warn('Could not load audit trail from backend:', e);
        }

        // Load live rules from FastAPI backend
        try {
          const liveRules = await api.rules.list();
          if (liveRules && liveRules.length > 0) {
            setRules(liveRules);
          }
        } catch (e) {
          console.warn('Could not load rules from backend:', e);
        }

        // Load live documents from FastAPI backend
        try {
          const liveDocs = await api.documents.list();
          if (liveDocs && liveDocs.length > 0) {
            setDocuments(liveDocs);
          }
        } catch (e) {
          console.warn('Could not load documents from backend:', e);
        }

        // Load live verification reports from FastAPI backend
        try {
          const liveReports = await api.reports.list();
          if (liveReports && liveReports.length > 0) {
            setReports(liveReports);
          }
        } catch (e) {
          console.warn('Could not load reports from backend:', e);
        }

        showToast(`Connected to FastAPI Backend (${latency}ms)`);
        setIsCheckingBackend(false);
        return true;
      }
      throw new Error('Health check returned non-healthy status');
    } catch (err) {
      console.info('Backend unreachable, using demo data fallback:', err);
      setBackendConnected(false);
      setIsFallbackMode(true);
      setBackendLatencyMs(null);
      setIsCheckingBackend(false);
      return false;
    }
  }, [showToast]);

  // Initial connection check on mount
  useEffect(() => {
    checkBackendConnection();
  }, [checkBackendConnection]);

  const setCurrentRole = (role: UserRole) => {
    setCurrentRoleState(role);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vt_active_role', role);
    }
    const roleLabels: Record<UserRole, string> = {
      reviewer: 'Senior Compliance Officer',
      applicant: 'Authorized Institutional Representative',
      administrator: 'System & Policy Administrator'
    };
    setUserProfile((prev) => ({
      ...prev,
      role,
      roleLabel: roleLabels[role]
    }));
    showToast(`Switched active view role to: ${role.toUpperCase()}`);
  };

  const updateUserProfile = (updated: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...updated }));
    showToast('Profile and preferences updated successfully');
  };

  const addAuditEvent = async (action: string, applicationId: string, details: string) => {
    // If backend is online, persist to FastAPI audit endpoint
    if (backendConnected) {
      try {
        const liveEvent = await api.audit.create({
          action,
          applicationId,
          details,
          user: userProfile.name,
          userRole: currentRole
        });
        setAuditTrail((prev) => [liveEvent, ...prev]);
        return;
      } catch (err) {
        console.warn('Failed to persist audit event to backend, falling back to local:', err);
      }
    }

    // Fallback in-memory audit event
    const newEvent: AuditEvent = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: 'short'
      }) + ' ' + (new Date().getFullYear()),
      user: userProfile.name,
      userRole: currentRole,
      action,
      applicationId,
      details,
      hash: 'sha256:' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    };
    setAuditTrail((prev) => [newEvent, ...prev]);
  };

  const addApplication = async (app: Application) => {
    // If backend is connected, POST to FastAPI
    if (backendConnected) {
      try {
        const created = await api.applications.create(app);
        setApplications((prev) => [created, ...prev]);
        await addAuditEvent('Application Created', created.id, `New verification submitted: ${created.title}`);
        showToast(`Verification created in FastAPI: ${created.id}`);
        return;
      } catch (err) {
        console.warn('FastAPI create failed, falling back to local memory store:', err);
      }
    }

    // Fallback local memory store
    setApplications((prev) => [app, ...prev]);
    if (app.documents && app.documents.length > 0) {
      setDocuments((prev) => [...app.documents, ...prev]);
    }
    const newReport: VerificationReport = {
      id: `REP${app.id.replace('APP', '')}`,
      applicationId: app.id,
      applicantName: app.applicantName,
      generatedDate: app.submittedDate,
      findingsCount: app.findings.length,
      complianceScore: app.complianceScore,
      status: app.status,
      summary: `Automated simulated verification completed for ${app.title}. Identified ${app.findings.length} findings.`,
      verifiedBy: 'AI Engine v3.2 (Simulated)'
    };
    setReports((prev) => [newReport, ...prev]);
    await addAuditEvent('Application Created', app.id, `New verification submitted: ${app.title}`);
    showToast(`Verification created: ${app.id} (Demo Fallback)`);
  };

  const updateApplicationStatus = async (id: string, status: ApplicationStatus, notes?: string) => {
    // If backend connected, PATCH status in FastAPI
    if (backendConnected) {
      try {
        const updated = await api.applications.updateStatus(id, status, userProfile.name, notes);
        setApplications((prev) =>
          prev.map((app) => (app.id === id ? updated : app))
        );
        await addAuditEvent(`Status Changed: ${status}`, id, notes || `Status updated to ${status}`);
        showToast(`Application ${id} marked as ${status} (FastAPI Synced)`);
        return;
      } catch (err) {
        console.warn('FastAPI status patch failed, updating local state:', err);
      }
    }

    // Fallback local update
    setApplications((prev) =>
      prev.map((app) =>
        app.id === id
          ? {
              ...app,
              status,
              lastUpdated: 'Just now',
              timeline: [
                ...app.timeline,
                {
                  step: `Status Changed to ${status}`,
                  timestamp: 'Just now',
                  status: 'completed',
                  details: notes || `Action taken by ${userProfile.name}`
                }
              ]
            }
          : app
      )
    );
    await addAuditEvent(`Status Changed: ${status}`, id, notes || `Status updated to ${status}`);
    showToast(`Application ${id} marked as ${status}`);
  };

  const refreshApplication = useCallback(async (id: string): Promise<Application | undefined> => {
    if (backendConnected) {
      try {
        const fresh = await api.applications.get(id);
        setApplications((prev) => prev.map((app) => (app.id === id ? fresh : app)));
        return fresh;
      } catch (err) {
        console.warn('Could not refresh application from backend:', err);
      }
    }
    return undefined;
  }, [backendConnected]);

  const addDocument = (doc: DocumentItem) => {
    setDocuments((prev) => [doc, ...prev]);
    addAuditEvent('Document Uploaded', doc.applicationId, `Added document ${doc.name} (${doc.size})`);
    showToast(`Document uploaded: ${doc.name}`);
  };

  const uploadDocumentFile = async (
    file: File,
    applicationId: string,
    docType: DocumentItem['type'] = 'Application'
  ): Promise<DocumentItem> => {
    if (backendConnected) {
      try {
        const uploaded = await api.documents.upload(file, applicationId, docType);
        setDocuments((prev) => [uploaded, ...prev]);
        await addAuditEvent(
          'Document Uploaded & OCR Processed',
          applicationId,
          `Uploaded ${uploaded.name} (${uploaded.size}) - Method: ${uploaded.extractionMethod || 'direct'}`
        );
        showToast(`Document uploaded & OCR processed: ${uploaded.name}`);
        return uploaded;
      } catch (err: any) {
        console.warn('Backend document upload failed:', err);
        showToast(`Upload failed: ${err.message || 'Server error'}`);
        throw err;
      }
    }

    // Fallback demo simulation if backend is offline
    const ext = file.name.split('.').pop()?.toUpperCase();
    const format = ext === 'PNG' ? 'PNG' : ext === 'JPG' || ext === 'JPEG' ? 'JPG' : 'PDF';
    const fallbackDoc: DocumentItem = {
      id: `DOC-DEMO-${Date.now().toString().slice(-4)}`,
      name: file.name,
      type: docType,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      applicationId,
      uploadedDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }).replace(/ /g, '-'),
      status: 'Processed',
      ocrStatus: 'Completed',
      fileFormat: format,
      authenticityScore: 97.8,
      extractionMethod: 'demo_fallback',
      extractedFields: {
        'File Name': file.name,
        'Application Reference': applicationId,
        'Extraction Note': 'Demo fallback mode (FastAPI backend offline)'
      },
      demo_mode: true
    };
    setDocuments((prev) => [fallbackDoc, ...prev]);
    await addAuditEvent('Document Uploaded (Demo)', applicationId, `Uploaded ${fallbackDoc.name}`);
    showToast(`Document uploaded in demo fallback mode: ${fallbackDoc.name}`);
    return fallbackDoc;
  };

  const deleteDocument = async (id: string) => {
    const doc = documents.find((d) => d.id === id);
    if (backendConnected) {
      try {
        await api.documents.delete(id);
      } catch (err) {
        console.warn('Backend delete document failed:', err);
      }
    }
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (doc) {
      addAuditEvent('Document Removed', doc.applicationId, `Deleted document ${doc.name}`);
      showToast(`Document ${doc.name} deleted`);
    }
  };

  const toggleRule = async (id: string) => {
    const targetRule = rules.find((r) => r.id === id);
    const newEnabledState = targetRule ? !targetRule.enabled : true;

    // If backend connected, PATCH rule status in FastAPI
    if (backendConnected) {
      try {
        const updatedRule = await api.rules.toggle(id, newEnabledState);
        setRules((prev) => prev.map((r) => (r.id === id ? updatedRule : r)));
        await addAuditEvent(
          'Rule Config Updated',
          'SYSTEM-RULES',
          `Rule ${id} (${updatedRule.name}) ${newEnabledState ? 'Enabled' : 'Disabled'} via FastAPI`
        );
        showToast(`Rule ${id} ${newEnabledState ? 'Enabled' : 'Disabled'} (FastAPI Synced)`);
        return;
      } catch (err) {
        console.warn('FastAPI rule toggle failed, using local fallback:', err);
      }
    }

    // Fallback local update
    setRules((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          addAuditEvent(
            'Rule Config Updated',
            'SYSTEM-RULES',
            `Rule ${r.id} (${r.name}) ${newEnabledState ? 'Enabled' : 'Disabled'}`
          );
          showToast(`Rule ${r.id} ${newEnabledState ? 'Enabled' : 'Disabled'}`);
          return { ...r, enabled: newEnabledState };
        }
        return r;
      })
    );
  };

  const addRule = (newRule: ComplianceRule) => {
    setRules((prev) => [...prev, newRule]);
    addAuditEvent('Rule Created', 'SYSTEM-RULES', `Created compliance rule ${newRule.id}: ${newRule.name}`);
    showToast(`Compliance Rule ${newRule.id} created`);
  };

  const addReport = (report: VerificationReport) => {
    setReports((prev) => [report, ...prev]);
  };

  const refreshReports = useCallback(async (): Promise<void> => {
    try {
      const liveReports = await api.reports.list();
      if (liveReports) {
        setReports(liveReports);
      }
    } catch (e) {
      console.warn('Could not refresh reports from backend:', e);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        applications,
        documents,
        rules,
        reports,
        auditTrail,
        userProfile,
        currentRole,
        searchQuery,
        setSearchQuery,
        setCurrentRole,
        updateUserProfile,
        addApplication,
        updateApplicationStatus,
        addDocument,
        uploadDocumentFile,
        deleteDocument,
        toggleRule,
        addRule,
        addAuditEvent,
        addReport,
        toastMessage,
        showToast,
        backendConnected,
        isCheckingBackend,
        backendLatencyMs,
        isFallbackMode,
        checkBackendConnection,
        refreshApplication,
        refreshReports
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
