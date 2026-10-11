import { apiClient, BASE_HOST, API_URL, UPLOAD_TIMEOUT_MS } from '../src/api/client';
import {
  getBlocks,
  getBlock,
  createBlock,
  getDashboardStats,
  GraniteBlockItem,
  CreateBlockParams,
  DashboardStats,
} from '../src/api/blocks';
import {
  getQuarries,
  createQuarry,
  QuarryItem,
} from '../src/api/quarries';
import {
  createCaptureSession,
  uploadSessionImage,
  completeCaptureSession,
  startAnalysisJob,
  getAnalysisJob,
  getBlockMeasurement,
  getBlockReport,
  listAnalysisJobs,
  recordPhysicalReference,
  getPhysicalComparison,
} from '../src/api/images';

export interface OfficerItem {
  id: number;
  name: string;
  role: string;
  badge_number?: string;
  phone?: string;
  assigned_quarry_id?: number;
}

export interface DefectItem {
  id: number;
  block_id: number;
  defect_type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description?: string;
  location_notes?: string;
}

export interface AssessmentItem {
  id: number;
  block_id: number;
  seigniorage_fee_inr: number;
  tcs_cess_inr?: number;
  total_royalty_inr?: number;
  status: string;
  assessed_at?: string;
}

export interface DispatchItem {
  id: number;
  block_id: number;
  destination: string;
  permit_number: string;
  status: string;
  dispatched_at?: string;
}

export interface ApprovalEventItem {
  id: number;
  block_id: number;
  actor_name: string;
  action: string;
  timestamp: string;
  notes?: string;
}

export const api = {
  // Base constants
  BASE_HOST,
  API_URL,

  // Health
  async getHealth() {
    try {
      const res = await apiClient.get('/health');
      return res.data;
    } catch {
      return { status: 'offline', timestamp: new Date().toISOString() };
    }
  },

  // Blocks
  getBlocks,
  getBlock,
  createBlock,
  getBlockStats: getDashboardStats,

  // Quarries
  getQuarries,
  createQuarry,
  async getQuarry(id: number | string): Promise<QuarryItem> {
    const res = await apiClient.get<QuarryItem>(`/quarries/${id}`);
    return res.data;
  },

  // Capture Sessions & Analysis
  createCaptureSession,
  async uploadImage(sessionId: number, uri: string, sequenceNumber = 0) {
    return uploadSessionImage(sessionId, uri, sequenceNumber);
  },
  async completeSession(sessionId: number) {
    return completeCaptureSession(sessionId);
  },
  async getCaptureSessions(blockId: number | string) {
    const res = await apiClient.get(`/capture/sessions?block_id=${blockId}`);
    return res.data;
  },
  startAnalysis: startAnalysisJob,
  getAnalysisJob,
  listAnalysisJobs,
  getBlockMeasurement,
  getBlockReport,
  recordPhysicalReference,
  getPhysicalComparison,

  // Dashboard & Officers
  async getDashboard(role?: string): Promise<DashboardStats> {
    const res = await apiClient.get<DashboardStats>(`/dashboard${role ? `?role=${role}` : ''}`);
    return res.data;
  },
  async getOfficers(): Promise<OfficerItem[]> {
    try {
      const res = await apiClient.get<OfficerItem[]>('/officers/');
      return res.data;
    } catch {
      return [
        { id: 1, name: 'Mining Officer Rao', role: 'Mining Officer', badge_number: 'AP-MIN-042' },
        { id: 2, name: 'Field Supervisor Naidu', role: 'Field Supervisor', badge_number: 'AP-MIN-109' },
      ];
    }
  },
  async createOfficer(data: Partial<OfficerItem>): Promise<OfficerItem> {
    const res = await apiClient.post<OfficerItem>('/officers/', data);
    return res.data;
  },

  // Defects & Assessments
  async getDefects(blockId: number | string): Promise<DefectItem[]> {
    try {
      const res = await apiClient.get<DefectItem[]>(`/blocks/${blockId}/defects`);
      return res.data;
    } catch {
      return [];
    }
  },
  async getAssessment(blockId: number | string): Promise<AssessmentItem | null> {
    try {
      const res = await apiClient.get<AssessmentItem>(`/seigniorage/${blockId}`);
      return res.data;
    } catch {
      return null;
    }
  },
  async getDispatch(blockId: number | string): Promise<DispatchItem | null> {
    try {
      const res = await apiClient.get<DispatchItem>(`/dispatch/${blockId}`);
      return res.data;
    } catch {
      return null;
    }
  },
  async getApprovalEvents(blockId: number | string): Promise<ApprovalEventItem[]> {
    try {
      const res = await apiClient.get<ApprovalEventItem[]>(`/blocks/${blockId}/events`);
      return res.data;
    } catch {
      return [];
    }
  },
};

export default api;
