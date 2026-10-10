import { apiClient, BASE_HOST } from './client';

export interface QualityAnalysisResult {
  image_width: number;
  image_height: number;
  brightness: number;
  contrast: number;
  blur_score: number;
  quality_status: 'PASS' | 'REVIEW_REQUIRED';
  warnings: string[];
  detected_markers: Array<{
    id: number;
    corners_px: number[][];
    average_edge_px: number;
  }>;
  marker_count: number;
  metric_calibration_status: string;
}

export interface ImageAnalysisResponse {
  image_id: string;
  sha256: string;
  analysis: QualityAnalysisResult;
  annotated_image_url: string;
}

export interface AnalysisJobStatus {
  id: number;
  block_id: number;
  status: 'PENDING' | 'VALIDATING' | 'FEATURE_MATCHING' | 'RECONSTRUCTING' | 'MEASURING' | 'COMPLETED' | 'FAILED';
  current_step: string;
  progress_pct: number;
  error_message?: string;
  result_summary?: any;
}

export interface MeasurementData {
  id: number;
  block_id: number;
  length_cm: number | null;
  breadth_cm: number | null;
  height_cm: number | null;
  volume_m3: number | null;
  weight_mt: number | null;
  confidence: number;
  status: 'MEASURED' | 'ESTIMATED' | 'PARTIAL' | 'UNVERIFIED' | 'FAILED';
  calibration_status: string;
  measurement_type: string;
  reconstructed_points?: number;
  usable_images?: number;
  warnings?: string[];
  created_at?: string;
}

export const analyzeSingleImage = async (uri: string): Promise<ImageAnalysisResponse> => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'photo.jpg';
  formData.append('file', {
    uri,
    name: filename,
    type: 'image/jpeg',
  } as any);

  const response = await apiClient.post<ImageAnalysisResponse>('/images/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const createCaptureSession = async (blockId: number | string, officerName = 'Officer') => {
  const response = await apiClient.post(`/capture/sessions?block_id=${blockId}&officer_name=${encodeURIComponent(officerName)}`);
  return response.data;
};

export const uploadSessionImage = async (sessionId: number, uri: string, sequenceNumber = 0) => {
  const formData = new FormData();
  const filename = uri.split('/').pop() || `img_${sequenceNumber}.jpg`;
  formData.append('file', {
    uri,
    name: filename,
    type: 'image/jpeg',
  } as any);

  const response = await apiClient.post(`/capture/sessions/${sessionId}/images?sequence_number=${sequenceNumber}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const completeCaptureSession = async (sessionId: number) => {
  const response = await apiClient.post(`/capture/sessions/${sessionId}/complete`);
  return response.data;
};

export const startAnalysisJob = async (blockId: number | string) => {
  const response = await apiClient.post(`/analysis/jobs?block_id=${blockId}`);
  return response.data;
};

export const getAnalysisJob = async (jobId: number): Promise<AnalysisJobStatus> => {
  const response = await apiClient.get<AnalysisJobStatus>(`/analysis/jobs/${jobId}`);
  return response.data;
};

export const getBlockMeasurement = async (blockId: number | string): Promise<MeasurementData> => {
  const response = await apiClient.get<MeasurementData>(`/measurements/${blockId}`);
  return response.data;
};

export const getBlockReport = async (blockId: number | string) => {
  const response = await apiClient.get(`/reports/${blockId}`);
  return response.data;
};
