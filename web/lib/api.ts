/**
 * API Client for GraniteMeasure AI Backend
 * Matches the real FastAPI backend at /api/v1/
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '' : (process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:8000'));

// --- Type Definitions ---

export interface Quarry {
  id: string;
  name: string;
  code?: string;
  lease_reference?: string;
  lease_number?: string;
  lease_holder?: string;
  location?: string;
  district?: string;
  mandal?: string;
  village?: string;
  granite_category?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  operator_id?: string;
  is_active?: boolean;
  status?: string;
  active_blocks_count?: number;
  created_at?: string;
}

export type BlockType = 'RAW' | 'PROCESSED';
export type BlockStatus =
  | 'REGISTERED'
  | 'CAPTURED'
  | 'CAPTURING'
  | 'PROCESSING'
  | 'ANALYZING'
  | 'UPLOADED'
  | 'MEASURED'
  | 'VERIFIED'
  | 'ASSESSED'
  | 'APPROVED'
  | 'DISPATCHED'
  | 'FAILED';

export interface GraniteBlock {
  id: string;
  identifier?: string;
  block_number?: string;
  quarry_id: string;
  color_group?: string;
  granite_category?: string;
  block_type: BlockType;
  status: BlockStatus;
  length_m?: number;
  breadth_m?: number;
  height_m?: number;
  volume_m3?: number;
  weight_tons?: number;
  weight_mt?: number;
  gps_latitude?: number;
  gps_longitude?: number;
  observations?: string;
  notes?: string;
  registered_at?: string;
  created_at?: string;
  updated_at?: string;
  measurement?: MeasurementResult;
  session_count?: number;
  is_archived?: boolean;
  archived_at?: string;
  quarry_name?: string;
}

export interface CaptureSession {
  id: string;
  block_id: string;
  officer_name?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  image_count: number;
  created_at: string;
  completed_at?: string;
  images?: BlockImage[];
}

export interface BlockImage {
  id: string;
  session_id: string;
  block_id: string;
  file_path: string;
  file_url?: string;
  original_filename: string;
  sha256?: string;
  file_size?: number;
  image_width?: number;
  image_height?: number;
  sequence_number: number;
  uploaded_at: string;
  quality?: ImageQualityResult;
  granite_verdict?: 'ACCEPTED_GRANITE_BLOCK' | 'CLOSEUP_SURFACE' | 'UNCERTAIN_GRANITE' | 'REJECTED_UNRELATED' | 'REJECTED_POOR_QUALITY' | string;
  granite_score?: number;
}

export interface ImageQualityResult {
  id: string;
  image_id: string;
  is_pass: boolean;
  blur_score: number;
  brightness: number;
  contrast: number;
  resolution_ok: boolean;
  warnings: string[];
  analyzed_at: string;
}

export interface CalibrationResult {
  id: string;
  session_id: string;
  marker_detected: boolean;
  marker_count: number;
  scale_px_per_cm?: number;
  marker_size_cm: number;
  reprojection_error?: number;
  status: 'CALIBRATED' | 'NOT_CALIBRATED' | 'PARTIAL';
  details?: Record<string, any>;
  created_at: string;
}

export type JobStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'RUNNING'
  | 'VALIDATING'
  | 'FEATURE_MATCHING'
  | 'RECONSTRUCTING'
  | 'MEASURING'
  | 'COMPLETED'
  | 'FAILED';

export interface AnalysisJob {
  id: string;
  block_id: string;
  session_id?: string;
  job_type?: string;
  status: JobStatus;
  current_step?: string;
  progress_pct?: number;
  progress?: number;
  error_message?: string;
  result_summary?: Record<string, any>;
  created_at: string;
  completed_at?: string;
}

export interface MeasurementResult {
  id: string;
  block_id: string;
  job_id?: string;
  length_cm?: number;
  breadth_cm?: number;
  height_cm?: number;
  volume_m3?: number;
  weight_mt?: number;
  confidence?: string;
  status: 'MEASURED' | 'ESTIMATED' | 'PARTIAL' | 'UNVERIFIED' | 'FAILED';
  calibration_status?: string;
  measurement_type?: string;
  reconstructed_points?: number;
  usable_images?: number;
  warnings?: string[];
  details?: Record<string, any>;
  created_at: string;
}

export interface GeometryData {
  points: number[][];
  bounding_box?: {
    corners: number[][];
    dimensions: { length: number; breadth: number; height: number };
  };
  cameras?: Array<{
    position: number[];
    rotation?: number[];
    image_id?: string;
  }>;
}

export interface SeigniorageRateVersion {
  id: string;
  version_name: string;
  description?: string;
  active_from: string;
  is_active: boolean;
  created_at: string;
}

export interface SeigniorageRate {
  id: string;
  version_id?: string;
  color_group?: string;
  category?: string;
  above_gangsaw_rate?: number;
  below_gangsaw_rate?: number;
  rate_above_gangsaw?: number;
  rate_below_gangsaw?: number;
  effective_from?: string;
  unit?: string;
}

export interface SeigniorageAssessment {
  id: string;
  block_id: string;
  measurement_id?: string;
  rate_version: string;
  color_group: string;
  classification: string;
  is_above_gangsaw: boolean;
  rate_per_mt: number;
  weight_mt: number;
  weight_source: string;
  indicative_amount: number;
  disclaimer: string;
  assessed_at: string;
}

export interface PhysicalReference {
  id: string;
  block_id: string;
  tape_length_cm?: number;
  tape_breadth_cm?: number;
  tape_height_cm?: number;
  marker_size_cm_verified?: number;
  weight_mt?: number;
  recorded_by: string;
  notes?: string;
  created_at: string;
}

export interface DispatchRecord {
  id: string;
  block_id: string;
  dispatch_date: string;
  vehicle_number: string;
  transit_pass_ref?: string;
  weighbridge_ref?: string;
  destination: string;
  status: 'CREATED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  created_at: string;
}

export interface ManualVerification {
  id: string;
  block_id: string;
  assessment_id?: string;
  verified_by: string;
  verification_status: 'APPROVED' | 'REJECTED' | 'PENDING';
  remarks?: string;
  verified_at?: string;
}

export interface WeighbridgeRecord {
  id: string;
  block_id: string;
  record_id: string;
  net_mass_mt: number;
  weighing_date: string;
  vehicle_number: string;
  operator?: string;
  source_record?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: string;
  timestamp: string;
}

export interface DashboardStats {
  total_blocks: number;
  pending_jobs: number;
  completed_measurements: number;
  recent_blocks: GraniteBlock[];
}

export interface BlockReport {
  block: GraniteBlock;
  quarry?: Quarry;
  measurement?: MeasurementResult;
  seigniorage?: SeigniorageAssessment;
  sessions?: CaptureSession[];
  audit_trail?: AuditLog[];
  generated_at: string;
}

export interface HealthStatus {
  status: string;
  version?: string;
  service?: string;
  colmap_available?: boolean;
  open3d_available?: boolean;
  trimesh_available?: boolean;
  tools?: {
    colmap?: boolean | Record<string, any>;
    open3d?: boolean;
    trimesh?: boolean;
    [key: string]: any;
  };
}

export interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface DefectResult {
  id: string;
  block_id: string;
  job_id?: string;
  defect_type: string;
  severity: string;
  description: string;
  location_description?: string;
  image_id?: string;
  bounding_box?: { x: number; y: number; w: number; h: number };
  affects_cutting: boolean;
  is_confirmed: boolean;
  confirmed_by?: string;
  notes?: string;
  created_at: string;
}

export interface CuttingPlan {
  id: string;
  block_id: string;
  plan_name: string;
  status: 'DRAFT' | 'PROPOSED' | 'APPROVED' | 'EXECUTED';
  target_length_cm?: number;
  target_breadth_cm?: number;
  target_height_cm?: number;
  original_volume_m3?: number;
  dressed_volume_m3?: number;
  removed_volume_m3?: number;
  recovery_ratio?: number;
  wastage_ratio?: number;
  optimization_method?: string;
  operations?: CuttingOperation[];
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface CuttingOperation {
  id: string;
  plan_id: string;
  operation_order: number;
  cut_type: 'PLANAR_CUT' | 'SURFACE_DRESS' | 'CORNER_REMOVAL' | 'DEFECT_AVOIDANCE';
  description: string;
  material_removed_m3?: number;
  reason: string;
  created_at: string;
}

export interface ApprovalEvent {
  id: string;
  block_id: string;
  event_type: string;
  from_status?: string;
  to_status?: string;
  performed_by?: string;
  role?: string;
  notes?: string;
  created_at: string;
}

// --- API Client ---

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    let clean = (baseUrl || '').trim().replace(/\/+$/, '');
    if (clean.endsWith('/api/v1')) {
      clean = clean.slice(0, -7);
    }
    this.baseUrl = clean;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Only set Content-Type for non-FormData bodies
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errDetail = '';
        try {
          const errData = await response.json();
          if (errData && (errData.detail || errData.message)) {
            errDetail = typeof errData.detail === 'string' ? errData.detail : (errData.message || JSON.stringify(errData.detail));
          }
        } catch {
          // ignore json parse error
        }

        let errMessage = errDetail;
        if (!errMessage) {
          if (response.status === 404) {
            errMessage = 'Resource not found in the mining registry (HTTP 404).';
          } else if (response.status === 405) {
            errMessage = 'Method Not Allowed (HTTP 405): The server endpoint rejected this HTTP method. Please check API deployment.';
          } else if (response.status === 409) {
            errMessage = 'Conflict (HTTP 409): The block has protected transit pass, dispatch, or statutory records and cannot be deleted. Archive the block instead.';
          } else if (response.status === 422) {
            errMessage = 'Invalid Request (HTTP 422): Parameters could not be processed by the server.';
          } else if (response.status >= 500) {
            errMessage = `Internal Server Error (HTTP ${response.status}): The backend failed to complete the request.`;
          } else {
            errMessage = `HTTP error! Status: ${response.status}`;
          }
        } else if (response.status === 405 && errMessage.toLowerCase().includes('method not allowed')) {
          errMessage = 'Action Not Allowed (HTTP 405): The server endpoint does not support this HTTP method. Check deployment routes.';
        }
        throw new Error(errMessage);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (error: any) {
      if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error('Unable to connect to the server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  // --- Health ---
  async getHealth(): Promise<HealthStatus> {
    return this.request<HealthStatus>('/api/v1/health');
  }

  // --- Dashboard ---
  async getDashboard(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/api/v1/dashboard');
  }

  // --- Auth ---
  async login(username: string, password: string): Promise<{ token: string; user: User }> {
    return this.request<{ token: string; user: User }>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  // --- Quarries ---
  async getQuarries(): Promise<Quarry[]> {
    return this.request<Quarry[]>('/api/v1/quarries/');
  }

  async getQuarry(id: string): Promise<Quarry> {
    return this.request<Quarry>(`/api/v1/quarries/${id}`);
  }

  async createQuarry(data: Partial<Quarry>): Promise<Quarry> {
    return this.request<Quarry>('/api/v1/quarries/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Blocks ---
  async getBlocks(params?: {
    quarry_id?: string;
    color_group?: string;
    search?: string;
    status?: string;
    include_archived?: boolean;
    only_archived?: boolean;
  }): Promise<GraniteBlock[]> {
    const query = new URLSearchParams();
    if (params?.quarry_id) query.append('quarry_id', params.quarry_id);
    if (params?.color_group) query.append('color_group', params.color_group);
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.include_archived) query.append('include_archived', 'true');
    if (params?.only_archived) query.append('only_archived', 'true');
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<GraniteBlock[]>(`/api/v1/blocks/${qs}`);
  }

  async getBlock(id: string): Promise<GraniteBlock> {
    return this.request<GraniteBlock>(`/api/v1/blocks/${id}`);
  }

  async getBlockWorkspace(id: string): Promise<any> {
    const cleanId = String(id).trim();
    const encodedId = encodeURIComponent(cleanId);
    try {
      return await this.request<any>(`/api/v1/blocks/${encodedId}/workspace`);
    } catch (workspaceErr: any) {
      // Resilience fallback: If workspace endpoint encounters error, synthesize initial workspace from block
      try {
        const blk = await this.getBlock(cleanId);
        if (blk) {
          return {
            id: blk.id,
            identifier: blk.identifier,
            block_number: blk.identifier,
            color_group: blk.color_group || 'Black Galaxy',
            granite_category: blk.color_group || 'Black Galaxy',
            block_type: blk.block_type || 'RAW',
            status: blk.status || 'REGISTERED',
            is_archived: blk.is_archived || false,
            archived_at: blk.archived_at,
            gps_latitude: blk.gps_latitude,
            gps_longitude: blk.gps_longitude,
            registered_at: blk.registered_at,
            block: blk,
            quarry: {
              id: blk.quarry_id,
              name: blk.quarry_name || 'Associated Concession',
              district: 'Prakasam',
              mandal: 'Chimakurthy',
            },
            sessions: [],
            images: [],
            coverage: {
              total_accepted: 0,
              front_captured: false,
              back_captured: false,
              left_captured: false,
              right_captured: false,
              top_captured: false,
              bottom_captured: false,
              oblique_count: 0,
              calibration_status: 'NOT_CALIBRATED',
              reconstruction_readiness: 'INSUFFICIENT',
            },
            latest_job: null,
            measurement: null,
            defects: { defect_list: [], count: 0, cavity_volume_m3: 0 },
            defect_list: [],
            defect_summary: { total_defects: 0, critical_count: 0, moderate_count: 0, cavity_volume_loss_m3: 0 },
            cutting_plan: null,
            wastage: { accounting_valid: false },
            seigniorage: null,
            dispatch: null,
            audit_trail: [],
            advisory: [
              {
                priority: 'INFO',
                category: 'NEXT_STEPS',
                title: 'Capture Session Required',
                description: 'Registered block has no photographic evidence yet. Use GraniteMeasure AI mobile or upload quarry photos to start.',
              },
            ],
          };
        }
      } catch {
        // Fallback also failed, rethrow workspaceErr
      }
      throw workspaceErr;
    }
  }

  async getBlockCoverage(id: string): Promise<any> {
    return this.request<any>(`/api/v1/blocks/${id}/coverage`);
  }

  async archiveBlock(id: string, reason?: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/v1/blocks/${id}/archive`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Archived by mining officer' }),
    });
  }

  async restoreBlock(id: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(`/api/v1/blocks/${id}/restore`, {
      method: 'POST',
    });
  }

  async deleteBlock(
    id: string,
    confirmIdentifier?: string,
    reason?: string
  ): Promise<{ status: string; message: string; is_deleted?: boolean }> {
    const cleanId = encodeURIComponent(String(id).trim());
    const params = new URLSearchParams();
    if (confirmIdentifier) params.append('confirm_identifier', confirmIdentifier);
    if (reason) params.append('reason', reason);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const payload = {
      confirm_identifier: confirmIdentifier,
      reason: reason || 'Administrative block deletion',
      force_hard_delete: false,
    };

    try {
      // 1. Try canonical DELETE /api/v1/blocks/{id}
      return await this.request<{ status: string; message: string; is_deleted?: boolean }>(
        `/api/v1/blocks/${cleanId}${qs}`,
        {
          method: 'DELETE',
          body: JSON.stringify(payload),
        }
      );
    } catch (err: any) {
      // If server or proxy returns 405 Method Not Allowed, fallback to POST /{id}/delete or POST /{id}/archive
      const is405 = err?.message?.includes('405') || err?.message?.toLowerCase().includes('method not allowed');
      if (is405) {
        try {
          return await this.request<{ status: string; message: string; is_deleted?: boolean }>(
            `/api/v1/blocks/${cleanId}/delete`,
            {
              method: 'POST',
              body: JSON.stringify(payload),
            }
          );
        } catch (postErr: any) {
          // If POST /delete is also unavailable on older proxy, perform soft deletion via archive
          if (postErr?.message?.includes('404') || postErr?.message?.includes('405')) {
            const arc = await this.archiveBlock(id, reason || 'Archived via safe deletion');
            return {
              status: 'success',
              message: arc.message || `Block ${id} archived to safe storage.`,
              is_deleted: true,
            };
          }
          throw postErr;
        }
      }
      throw err;
    }
  }

  async bulkDeleteBlocks(
    blockIds: string[],
    reason?: string,
    forceHardDelete?: boolean
  ): Promise<{
    status: string;
    total: number;
    success_count: number;
    restricted_count: number;
    failed_count: number;
    results: any[];
  }> {
    return this.request('/api/v1/blocks/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({
        block_ids: blockIds,
        reason: reason || 'Bulk administrative deletion',
        force_hard_delete: Boolean(forceHardDelete),
      }),
    });
  }

  async bulkArchiveBlocks(
    blockIds: string[],
    reason?: string
  ): Promise<{
    status: string;
    total: number;
    success_count: number;
    failed_count: number;
    results: any[];
  }> {
    return this.request('/api/v1/blocks/bulk/archive', {
      method: 'POST',
      body: JSON.stringify({
        block_ids: blockIds,
        reason: reason || 'Bulk archive action',
      }),
    });
  }

  async getBlockSummary(id: string): Promise<any> {
    return this.request<any>(`/api/v1/blocks/${id}/summary`);
  }

  async createBlock(data: Partial<GraniteBlock> & {
    quarry_id: string;
    color_group?: string;
    granite_category?: string;
    block_type: BlockType;
    identifier?: string;
    block_number?: string;
  }): Promise<GraniteBlock> {
    const payload = {
      ...data,
      color_group: data.color_group || data.granite_category || 'Black Galaxy',
      identifier: data.identifier || data.block_number,
    };
    return this.request<GraniteBlock>('/api/v1/blocks/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // --- Capture Sessions ---
  async createCaptureSession(blockId: string, officerName?: string, stage: string = 'RAW'): Promise<CaptureSession> {
    return this.request<CaptureSession>('/api/v1/capture/sessions', {
      method: 'POST',
      body: JSON.stringify({ block_id: blockId, officer_name: officerName, stage }),
    });
  }

  async getCaptureSession(sessionId: string): Promise<CaptureSession> {
    return this.request<CaptureSession>(`/api/v1/capture/sessions/${sessionId}`);
  }

  async getCaptureSessions(blockId?: string): Promise<CaptureSession[]> {
    const qs = blockId ? `?block_id=${blockId}` : '';
    return this.request<CaptureSession[]>(`/api/v1/capture/sessions${qs}`);
  }

  async uploadSessionImage(sessionId: string, file: File, sequenceNumber: number): Promise<BlockImage> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sequence_number', String(sequenceNumber));
    return this.request<BlockImage>(`/api/v1/capture/sessions/${sessionId}/images`, {
      method: 'POST',
      body: formData,
    });
  }

  async completeCaptureSession(sessionId: string): Promise<CaptureSession> {
    return this.request<CaptureSession>(`/api/v1/capture/sessions/${sessionId}/complete`, {
      method: 'POST',
    });
  }

  // --- Images ---
  async analyzeImage(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<any>('/api/v1/images/analyze', {
      method: 'POST',
      body: formData,
    });
  }

  getAnnotatedImageUrl(imageId: string): string {
    return `${this.baseUrl}/api/v1/images/${imageId}/annotated`;
  }

  getUploadedImageUrl(filePath: string): string {
    return `${this.baseUrl}/storage/${filePath}`;
  }

  // --- Analysis Jobs ---
  async createAnalysisJob(blockId: string, sessionId?: string, stage: string = 'RAW'): Promise<AnalysisJob> {
    return this.request<AnalysisJob>('/api/v1/analysis/jobs', {
      method: 'POST',
      body: JSON.stringify({ block_id: blockId, session_id: sessionId, stage }),
    });
  }

  async triggerAnalysis(blockId: string, stage: string = 'RAW'): Promise<AnalysisJob> {
    return this.createAnalysisJob(blockId, undefined, stage);
  }

  async getAnalysisJob(jobId: string): Promise<AnalysisJob> {
    return this.request<AnalysisJob>(`/api/v1/analysis/jobs/${jobId}`);
  }

  async getAnalysisJobs(blockId?: string): Promise<AnalysisJob[]> {
    const qs = blockId ? `?block_id=${blockId}` : '';
    return this.request<AnalysisJob[]>(`/api/v1/analysis/${qs}`);
  }

  // --- Dressing & Comparison ---
  async getComparison(blockId: string): Promise<any> {
    const cleanId = encodeURIComponent(String(blockId).trim());
    return this.request<any>(`/api/v1/blocks/${cleanId}/comparison`);
  }

  async generateDressingPlan(
    blockId: string,
    objective: string = 'MAXIMIZE_RECTANGULAR_YIELD',
    customMarginCm?: number
  ): Promise<any> {
    const cleanId = encodeURIComponent(String(blockId).trim());
    return this.request<any>(`/api/v1/blocks/${cleanId}/dressing-plan/generate`, {
      method: 'POST',
      body: JSON.stringify({
        dressing_objective: objective,
        custom_margin_cm: customMarginCm,
      }),
    });
  }

  async recordTapeReference(
    blockId: string,
    data: {
      length_m: number;
      breadth_m: number;
      height_m: number;
      verified_by?: string;
      tool_type?: string;
      notes?: string;
    }
  ): Promise<any> {
    const cleanId = encodeURIComponent(String(blockId).trim());
    return this.request<any>(`/api/v1/validation/${cleanId}/reference`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Measurements ---
  async getMeasurements(): Promise<MeasurementResult[]> {
    return this.request<MeasurementResult[]>('/api/v1/measurements/');
  }

  async getMeasurement(blockId: string): Promise<MeasurementResult> {
    return this.request<MeasurementResult>(`/api/v1/measurements/${blockId}`);
  }

  async getGeometry(blockId: string): Promise<GeometryData> {
    return this.request<GeometryData>(`/api/v1/measurements/${blockId}/geometry`);
  }

  // --- Seigniorage ---
  async getSeigniorageRates(): Promise<{ rates: SeigniorageRate[]; version?: SeigniorageRateVersion }> {
    return this.request<{ rates: SeigniorageRate[]; version?: SeigniorageRateVersion }>('/api/v1/seigniorage/rates');
  }

  async calculateSeigniorage(data: {
    block_id?: string;
    color_group: string;
    length_cm: number;
    breadth_cm: number;
    height_cm: number;
    density_kg_m3?: number;
    weight_mt?: number;
  }): Promise<SeigniorageAssessment> {
    return this.request<SeigniorageAssessment>('/api/v1/seigniorage/calculate', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Reports ---
  async getBlockReport(blockId: string): Promise<BlockReport> {
    return this.request<BlockReport>(`/api/v1/reports/${blockId}`);
  }

  async getAvailableReports(): Promise<{ block_id: string; identifier: string }[]> {
    return this.request<{ block_id: string; identifier: string }[]>('/api/v1/reports/');
  }

  // --- Audit ---
  async getAuditLogs(params?: { entity_type?: string; entity_id?: string; limit?: number }): Promise<AuditLog[]> {
    const query = new URLSearchParams();
    if (params?.entity_type) query.append('entity_type', params.entity_type);
    if (params?.entity_id) query.append('entity_id', params.entity_id);
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<AuditLog[]>(`/api/v1/audit/${qs}`);
  }

  async getBlockAuditTrail(blockId: string): Promise<AuditLog[]> {
    return this.request<AuditLog[]>(`/api/v1/audit/block/${blockId}`);
  }

  // --- Validation ---
  async recordPhysicalReference(blockId: string, data: Partial<PhysicalReference>): Promise<PhysicalReference> {
    return this.request<PhysicalReference>(`/api/v1/validation/${blockId}/reference`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getValidationComparison(blockId: string): Promise<any> {
    return this.request<any>(`/api/v1/validation/${blockId}`);
  }

  // --- Defects (extended API) ---
  async getDefects(blockId: string): Promise<DefectResult[]> {
    return this.request<DefectResult[]>(`/api/v1/blocks/${blockId}/defects`);
  }

  async createDefect(blockId: string, data: Partial<DefectResult>): Promise<DefectResult> {
    return this.request<DefectResult>(`/api/v1/blocks/${blockId}/defects`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async confirmDefect(defectId: string, confirmedBy: string): Promise<DefectResult> {
    return this.request<DefectResult>(`/api/v1/defects/${defectId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ confirmed_by: confirmedBy }),
    });
  }

  // --- Cutting Plans (extended API) ---
  async getCuttingPlans(blockId: string): Promise<CuttingPlan[]> {
    return this.request<CuttingPlan[]>(`/api/v1/blocks/${blockId}/cutting-plans`);
  }

  async createCuttingPlan(blockId: string, data: Partial<CuttingPlan>): Promise<CuttingPlan> {
    return this.request<CuttingPlan>(`/api/v1/blocks/${blockId}/cutting-plans`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getCuttingPlan(planId: string): Promise<CuttingPlan> {
    return this.request<CuttingPlan>(`/api/v1/cutting-plans/${planId}`);
  }

  async addCuttingOperation(planId: string, data: Partial<CuttingOperation>): Promise<CuttingOperation> {
    return this.request<CuttingOperation>(`/api/v1/cutting-plans/${planId}/operations`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Dispatch (extended API) ---
  async getDispatches(params?: { block_id?: string; status?: string }): Promise<DispatchRecord[]> {
    const query = new URLSearchParams();
    if (params?.block_id) query.append('block_id', params.block_id);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<DispatchRecord[]>(`/api/v1/dispatch/${qs}`);
  }

  async createDispatch(data: Partial<DispatchRecord>): Promise<DispatchRecord> {
    return this.request<DispatchRecord>('/api/v1/dispatch/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getDispatch(id: string): Promise<DispatchRecord> {
    return this.request<DispatchRecord>(`/api/v1/dispatch/${id}`);
  }

  async updateDispatch(id: string, data: Partial<DispatchRecord>): Promise<DispatchRecord> {
    return this.request<DispatchRecord>(`/api/v1/dispatch/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // --- Approval Events (extended API) ---
  async getApprovalEvents(blockId: string): Promise<ApprovalEvent[]> {
    return this.request<ApprovalEvent[]>(`/api/v1/blocks/${blockId}/approvals`);
  }

  async createApprovalEvent(blockId: string, data: Partial<ApprovalEvent>): Promise<ApprovalEvent> {
    return this.request<ApprovalEvent>(`/api/v1/blocks/${blockId}/approvals`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Verification ---
  async getVerifications(blockId: string): Promise<ManualVerification[]> {
    return this.request<ManualVerification[]>(`/api/v1/blocks/${blockId}/verifications`);
  }

  async createVerification(blockId: string, data: Partial<ManualVerification>): Promise<ManualVerification> {
    return this.request<ManualVerification>(`/api/v1/blocks/${blockId}/verifications`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Weighbridge ---
  async getWeighbridgeRecords(blockId: string): Promise<WeighbridgeRecord[]> {
    return this.request<WeighbridgeRecord[]>(`/api/v1/blocks/${blockId}/weighbridge`);
  }

  async createWeighbridgeRecord(blockId: string, data: Partial<WeighbridgeRecord>): Promise<WeighbridgeRecord> {
    return this.request<WeighbridgeRecord>(`/api/v1/blocks/${blockId}/weighbridge`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // --- Assistant ---
  async askAssistant(question: string, blockId?: string, language?: string): Promise<{ answer: string; sources: string[] }> {
    return this.request<{ answer: string; sources: string[] }>('/api/v1/assistant/ask', {
      method: 'POST',
      body: JSON.stringify({ question, block_id: blockId, language }),
    });
  }
}

export const api = new ApiClient();
export default api;
