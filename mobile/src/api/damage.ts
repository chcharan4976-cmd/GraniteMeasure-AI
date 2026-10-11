import { apiClient } from './client';

export interface DefectItem {
  id: string;
  defect_type: 'CAVITY' | 'FRACTURE' | 'CHIP' | 'CRACK' | 'PROTRUSION' | 'DISCOLORATION';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'MODERATE' | 'LOW';
  description: string;
  location_description?: string;
  image_id?: number | string;
  bounding_box?: { x: number; y: number; width: number; height: number };
  opening_width_cm?: number | null;
  opening_length_cm?: number | null;
  opening_area_cm2?: number | null;
  depth_status: 'UNAVAILABLE_SINGLE_VIEW' | 'ESTIMATED_MULTIVIEW' | 'SURFACE_TRACE_ONLY' | 'EDGE_IRREGULARITY' | 'MANUALLY_VERIFIED';
  estimated_depth_cm?: number | null;
  depth_uncertainty_cm?: number | null;
  depth_warning?: string;
  affects_cutting?: boolean;
  is_confirmed?: boolean;
  notes?: string;
}

export interface DamagePreventionRule {
  rule_id: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  title_te: string;
  action: string;
  reason: string;
}

export interface BlockDamageReport {
  block_id: number | string;
  block_identifier: string;
  analysis_status?: 'NOT_RUN' | 'IN_PROGRESS' | 'FAILED' | 'COMPLETED';
  job_id?: string | number | null;
  current_step?: string | null;
  error_message?: string | null;
  total_defects: number;
  defects: DefectItem[];
  total_missing_volume_cm3?: number;
  prevention_advisor: DamagePreventionRule[];
  accuracy_statement: string;
}

export const analyzeBlockDamage = async (blockId: number | string) => {
  const response = await apiClient.post(`/damage/block/${blockId}/analyze`);
  return response.data;
};

export const getBlockDamageReport = async (blockId: number | string): Promise<BlockDamageReport> => {
  const response = await apiClient.get<BlockDamageReport>(`/damage/block/${blockId}/report`);
  return response.data;
};

export const analyzeImageDamage = async (imageId: number | string) => {
  const response = await apiClient.post(`/damage/analyze-image/${imageId}`);
  return response.data;
};
