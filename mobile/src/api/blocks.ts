import { apiClient } from './client';

export interface MeasurementSummary {
  id: number;
  length_cm: number | null;
  breadth_cm: number | null;
  height_cm: number | null;
  volume_m3: number | null;
  weight_mt: number | null;
  confidence: number | null;
  status: 'MEASURED' | 'ESTIMATED' | 'PARTIAL' | 'UNVERIFIED' | 'FAILED';
  calibration_status: string;
}

export interface GraniteBlockItem {
  id: number;
  identifier: string;
  color_group: string;
  quarry_id: number;
  status: string;
  block_type?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  observations?: string;
  registered_at?: string;
  capture_sessions?: number;
  measurement?: MeasurementSummary | null;
  physical_reference?: {
    id?: number;
    tape_length_cm: number | null;
    tape_breadth_cm: number | null;
    tape_height_cm: number | null;
    recorded_by?: string;
  } | null;
}

export interface CreateBlockParams {
  quarry_id: number;
  color_group: string;
  identifier?: string;
  block_type?: string;
  gps_latitude?: number | null;
  gps_longitude?: number | null;
  observations?: string;
}

export interface DashboardStats {
  total_blocks: number;
  pending_analysis: number;
  completed_measurements: number;
  needs_verification: number;
  recent_blocks: Array<{
    id: number;
    identifier: string;
    color_group: string;
    status: string;
    registered_at: string;
  }>;
}

export const getBlocks = async (params?: { only_archived?: boolean; include_archived?: boolean }): Promise<GraniteBlockItem[]> => {
  const query = new URLSearchParams();
  if (params?.only_archived) query.append('only_archived', 'true');
  if (params?.include_archived) query.append('include_archived', 'true');
  const qs = query.toString() ? `?${query.toString()}` : '';
  const response = await apiClient.get<GraniteBlockItem[]>(`/blocks/${qs}`);
  return response.data;
};

export const getBlock = async (id: number | string): Promise<GraniteBlockItem> => {
  const response = await apiClient.get<GraniteBlockItem>(`/blocks/${id}`);
  return response.data;
};

export const getBlockWorkspace = async (id: number | string): Promise<any> => {
  const response = await apiClient.get<any>(`/blocks/${id}/workspace`);
  return response.data;
};

export const archiveBlock = async (id: number | string, reason?: string): Promise<any> => {
  const response = await apiClient.post<any>(`/blocks/${id}/archive`, {
    reason: reason || 'Archived by field officer',
  });
  return response.data;
};

export const restoreBlock = async (id: number | string): Promise<any> => {
  const response = await apiClient.post<any>(`/blocks/${id}/restore`);
  return response.data;
};

export const deleteBlock = async (
  id: number | string,
  confirmIdentifier?: string,
  reason?: string
): Promise<any> => {
  const params: Record<string, string> = {};
  if (confirmIdentifier) params.confirm_identifier = confirmIdentifier;
  if (reason) params.reason = reason;
  const response = await apiClient.delete<any>(`/blocks/${id}`, {
    params,
    data: {
      confirm_identifier: confirmIdentifier,
      reason: reason || 'Administrative field deletion',
    },
  });
  return response.data;
};

export const createBlock = async (data: CreateBlockParams): Promise<GraniteBlockItem> => {
  const response = await apiClient.post<GraniteBlockItem>('/blocks/', data);
  return response.data;
};

export const triggerAnalysis = async (blockId: number | string, stage: string = 'RAW'): Promise<any> => {
  const response = await apiClient.post<any>('/analysis/jobs', {
    block_id: blockId,
    stage: stage,
  });
  return response.data;
};

export const getComparison = async (blockId: number | string): Promise<any> => {
  const response = await apiClient.get<any>(`/blocks/${blockId}/comparison`);
  return response.data;
};

export const generateDressingPlan = async (
  blockId: number | string,
  objective: string = 'MAXIMIZE_RECTANGULAR_YIELD',
  customMarginCm: number = 3.0
): Promise<any> => {
  const response = await apiClient.post<any>(`/blocks/${blockId}/dressing-plan/generate`, {
    objective,
    custom_margin_cm: customMarginCm,
  });
  return response.data;
};

export const recordTapeReference = async (
  blockId: number | string,
  data: {
    tape_length_cm: number;
    tape_breadth_cm: number;
    tape_height_cm: number;
    weight_mt?: number;
    recorded_by?: string;
    notes?: string;
  }
): Promise<any> => {
  const response = await apiClient.post<any>(`/validation/${blockId}/reference`, data);
  return response.data;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await apiClient.get<DashboardStats>('/dashboard');
  return response.data;
};

