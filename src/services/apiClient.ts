import type {
  Application,
  DocumentItem,
  DocumentOCRResult,
  ComplianceRule,
  VerificationReport,
  AuditEvent,
  ApplicationStatus,
  VerificationFinding,
  ValidationSummaryResponse,
  FindingReviewStatus
} from '../types';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  demo_mode: boolean;
  subsystems: Record<string, string>;
  timestamp: string;
}

export interface ApplicationListResponse {
  items: Application[];
  total: number;
  skip: number;
  limit: number;
}

export interface ApplicationFilterParams {
  search?: string;
  status?: string;
  type?: string;
  priority?: string;
  skip?: number;
  limit?: number;
}

// Get the resolved API base URL
export function getApiBaseUrl(): string {
  // Check if custom endpoint configured in user localStorage
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem('vt_custom_api_url') : null;
  if (customUrl && customUrl.trim()) {
    return customUrl.trim().replace(/\/+$/, '');
  }
  // Vite env variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return (import.meta.env.VITE_API_BASE_URL as string).replace(/\/+$/, '');
  }
  // Default fallback
  return 'http://localhost:8000/api/v1';
}

// Get user configured API token safely from browser storage
export function getApiToken(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('vt_api_key') || sessionStorage.getItem('vt_api_key');
  if (stored && stored.trim()) return stored.trim();
  // Check Vite environment variable or fallback to dev key for seamless demo readiness
  const envToken = import.meta.env.VITE_API_KEY;
  if (envToken && typeof envToken === 'string' && envToken.trim()) {
    return envToken.trim();
  }
  return 'vt_live_948f9210bcdef45a78';
}

// Get active user role from storage for backend RBAC alignment
export function getActiveUserRole(): string {
  if (typeof window === 'undefined') return 'reviewer';
  return localStorage.getItem('vt_active_role') || 'reviewer';
}

// Universal fetch wrapper with timeout and error handling
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 7000
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  // Only set application/json if not sending FormData multipart
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Attach token
  const token = getApiToken();
  if (token) {
    headers['X-API-Key'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Attach active role for backend RBAC
  const role = getActiveUserRole();
  if (role) {
    headers['X-User-Role'] = role;
  }


  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData: any = null;
      try {
        errorData = await response.json();
      } catch {
        errorData = await response.text();
      }
      const message =
        errorData?.detail ||
        errorData?.message ||
        `HTTP Request failed with status ${response.status}: ${response.statusText}`;
      throw new ApiError(message, response.status, errorData);
    }

    // Parse JSON
    return (await response.json()) as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError(`Request timed out after ${timeoutMs}ms`, 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || 'Network connection failed', 0);
  }
}

// API methods catalog
export const api = {
  // Health & System
  health: {
    check: (timeoutMs = 4000): Promise<HealthCheckResponse> =>
      request<HealthCheckResponse>('/health', { method: 'GET' }, timeoutMs)
  },

  // Applications CRUD
  applications: {
    list: async (filters: ApplicationFilterParams = {}): Promise<ApplicationListResponse> => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status && filters.status !== 'All') params.append('status', filters.status);
      if (filters.type && filters.type !== 'All') params.append('type', filters.type);
      if (filters.priority && filters.priority !== 'All') params.append('priority', filters.priority);
      if (filters.skip !== undefined) params.append('skip', String(filters.skip));
      if (filters.limit !== undefined) params.append('limit', String(filters.limit));

      const queryStr = params.toString() ? `?${params.toString()}` : '';
      return request<ApplicationListResponse>(`/applications/${queryStr}`, { method: 'GET' });
    },

    get: (id: string): Promise<Application> =>
      request<Application>(`/applications/${encodeURIComponent(id)}`, { method: 'GET' }),

    create: (payload: Partial<Application>): Promise<Application> =>
      request<Application>('/applications/', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),

    updateStatus: (
      id: string,
      status: ApplicationStatus,
      reviewerName = 'Compliance Reviewer',
      notes?: string
    ): Promise<Application> =>
      request<Application>(`/applications/${encodeURIComponent(id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reviewerName, notes })
      }),

    delete: (id: string): Promise<{ success: boolean; message: string }> =>
      request<{ success: boolean; message: string }>(`/applications/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      }),

    validate: (id: string): Promise<ValidationSummaryResponse> =>
      request<ValidationSummaryResponse>(`/applications/${encodeURIComponent(id)}/validate`, {
        method: 'POST'
      }),

    getFindings: (id: string): Promise<VerificationFinding[]> =>
      request<VerificationFinding[]>(`/applications/${encodeURIComponent(id)}/findings`, {
        method: 'GET'
      }),

    getValidationSummary: (id: string): Promise<ValidationSummaryResponse> =>
      request<ValidationSummaryResponse>(`/applications/${encodeURIComponent(id)}/validation-summary`, {
        method: 'GET'
      }),

    updateFindingReview: (
      applicationId: string,
      findingId: string,
      status: FindingReviewStatus,
      reviewerNotes?: string,
      reviewerName = 'Compliance Reviewer'
    ): Promise<VerificationFinding> =>
      request<VerificationFinding>(
        `/applications/${encodeURIComponent(applicationId)}/findings/${encodeURIComponent(findingId)}/review`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            status,
            reviewerNotes,
            reviewerName
          })
        }
      )
  },

  // Audit Trail
  audit: {
    list: (applicationId?: string): Promise<AuditEvent[]> => {
      const queryStr = applicationId ? `?application_id=${encodeURIComponent(applicationId)}` : '';
      return request<AuditEvent[]>(`/audit/${queryStr}`, { method: 'GET' });
    },

    create: (event: {
      action: string;
      applicationId: string;
      details: string;
      user?: string;
      userRole?: string;
    }): Promise<AuditEvent> =>
      request<AuditEvent>('/audit/', {
        method: 'POST',
        body: JSON.stringify(event)
      })
  },

  // Compliance Rules
  rules: {
    list: (): Promise<ComplianceRule[]> =>
      request<ComplianceRule[]>('/rules/', { method: 'GET' }),

    toggle: (id: string, enabled: boolean): Promise<ComplianceRule> =>
      request<ComplianceRule>(`/rules/${encodeURIComponent(id)}/toggle`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled })
      }),

    test: (sampleData?: any): Promise<any> =>
      request<any>('/rules/test', {
        method: 'POST',
        body: JSON.stringify({ sampleData })
      })
  },

  // Document Vault
  documents: {
    list: (type?: string, applicationId?: string): Promise<DocumentItem[]> => {
      const params = new URLSearchParams();
      if (type && type !== 'All') params.append('type', type);
      if (applicationId) params.append('application_id', applicationId);
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      return request<DocumentItem[]>(`/documents/${queryStr}`, { method: 'GET' });
    },

    get: (id: string): Promise<DocumentItem> =>
      request<DocumentItem>(`/documents/${encodeURIComponent(id)}`, { method: 'GET' }),

    getOcr: (id: string): Promise<DocumentOCRResult> =>
      request<DocumentOCRResult>(`/documents/${encodeURIComponent(id)}/ocr`, { method: 'GET' }),

    upload: (file: File, applicationId: string, docType = 'Application'): Promise<DocumentItem> => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('application_id', applicationId);
      formData.append('doc_type', docType);

      return request<DocumentItem>('/documents/upload', {
        method: 'POST',
        body: formData
      }, 30000); // 30s timeout for OCR text extraction
    },

    delete: (id: string): Promise<{ success: boolean; message: string }> =>
      request<{ success: boolean; message: string }>(`/documents/${encodeURIComponent(id)}`, {
        method: 'DELETE'
      })
  },

  // Verification Reports
  reports: {
    list: (): Promise<VerificationReport[]> =>
      request<VerificationReport[]>('/reports/', { method: 'GET' }),

    get: (id: string): Promise<VerificationReport> =>
      request<VerificationReport>(`/reports/${encodeURIComponent(id)}`, { method: 'GET' }),

    generate: (applicationId: string): Promise<VerificationReport> =>
      request<VerificationReport>(`/reports/generate?application_id=${encodeURIComponent(applicationId)}`, {
        method: 'POST'
      }),

    downloadUrl: (id: string): string =>
      `${getApiBaseUrl()}/reports/${encodeURIComponent(id)}/download`,

    downloadPdf: async (id: string, filename?: string): Promise<void> => {
      const url = `${getApiBaseUrl()}/reports/${encodeURIComponent(id)}/download`;
      const token = getApiToken();
      const headers: Record<string, string> = {
        Accept: 'application/pdf'
      };
      if (token) {
        headers['X-API-Key'] = token;
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(url, {
        method: 'GET',
        headers
      });

      if (!res.ok) {
        let errMsg = `Failed to download PDF: ${res.status} ${res.statusText}`;
        try {
          const json = await res.json();
          if (json.detail) errMsg = json.detail;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const blob = await res.blob();
      const downloadBlobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadBlobUrl;
      link.download = filename || `${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadBlobUrl);
    }
  }
};
