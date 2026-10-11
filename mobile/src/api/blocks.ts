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

export const getBlocks = async (): Promise<GraniteBlockItem[]> => {
  const response = await apiClient.get<GraniteBlockItem[]>('/blocks/');
  return response.data;
};

export const getBlock = async (id: number | string): Promise<GraniteBlockItem> => {
  const response = await apiClient.get<GraniteBlockItem>(`/blocks/${id}`);
  return response.data;
};

export const createBlock = async (data: CreateBlockParams): Promise<GraniteBlockItem> => {
  const response = await apiClient.post<GraniteBlockItem>('/blocks/', data);
  return response.data;
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  const response = await apiClient.get<DashboardStats>('/dashboard');
  return response.data;
};
