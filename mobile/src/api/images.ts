import { apiClient, BASE_HOST, UPLOAD_TIMEOUT_MS } from './client';

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
  job_id?: number;
  length_cm: number | null;
  breadth_cm: number | null;
  height_cm: number | null;
  volume_m3: number | null;
  bbox_volume_m3?: number | null;
  irregular_volume_m3?: number | null;
  irregular_volume_status?: string;
  irregular_volume_reason?: string;
  weight_mt: number | null;
  estimated_mass_mt?: number | null;
  mass_source?: string;
  confidence: number | null;
  confidence_label?: string;
  confidence_basis?: string;
  status: 'MEASURED' | 'ESTIMATED' | 'PARTIAL' | 'UNVERIFIED' | 'FAILED';
  calibration_status: string;
  measurement_type: string;
  reconstructed_points?: number;
  registered_cameras?: number;
  usable_images?: number;
  total_images?: number;
  scale_residual_cm?: number | null;
  marker_size_cm?: number;
  marker_size_source?: string;
  coverage?: { unobserved_faces?: string[] };
  is_dense?: boolean;
  geometry_available?: boolean;
  warnings?: string[];
  created_at?: string;
}

export const resolveImageMimeAndName = (
  uri: string,
  fallbackName: string,
  explicitName?: string,
  explicitMime?: string
) => {
  let filename = explicitName || uri.split('/').pop() || fallbackName;
  const ext = filename.split('.').pop()?.toLowerCase();
  let mimeType =
    explicitMime ||
    (ext === 'png'
      ? 'image/png'
      : ext === 'webp'
      ? 'image/webp'
      : ext === 'heic' || ext === 'heif'
      ? 'image/heic'
      : 'image/jpeg');

  if (!filename.includes('.')) {
    const extToAdd =
      mimeType === 'image/png'
        ? '.png'
        : mimeType === 'image/webp'
        ? '.webp'
        : mimeType === 'image/heic' || mimeType === 'image/heif'
        ? '.heic'
        : '.jpg';
    filename = `${filename}${extToAdd}`;
  }
  return { filename, mimeType };
};

export const analyzeSingleImage = async (
  uri: string,
  explicitName?: string,
  explicitMime?: string
): Promise<ImageAnalysisResponse> => {
  const formData = new FormData();
  const { filename, mimeType } = resolveImageMimeAndName(uri, 'photo.jpg', explicitName, explicitMime);
  formData.append('file', {
    uri,
    name: filename,
    type: mimeType,
  } as any);

  const response = await apiClient.post<ImageAnalysisResponse>('/images/analyze', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: UPLOAD_TIMEOUT_MS,
  });
  return response.data;
};

export interface GraniteValidationResult {
  verdict: 'ACCEPTED_GRANITE_BLOCK' | 'CLOSEUP_SURFACE' | 'UNCERTAIN_GRANITE' | 'REJECTED_UNRELATED' | 'REJECTED_POOR_QUALITY';
  is_accepted: boolean;
  is_closeup_defect?: boolean;
  needs_review?: boolean;
  confidence: number;
  reasons: string[];
  suggested_action: 'PROCEED' | 'HOLD_FOR_REVIEW' | 'RETAKE' | 'CHOOSE_ANOTHER';
  message_en: string;
  message_te: string;
  metrics: {
    blur_score?: number;
    brightness?: number;
    contrast?: number;
    texture_energy?: number;
    grain_roughness?: number;
    line_count?: number;
    has_aruco?: boolean;
    face_detected?: boolean;
    is_document?: boolean;
    is_synthetic?: boolean;
  };
}

export const validateGraniteImage = async (
  uri: string,
  explicitName?: string,
  explicitMime?: string
): Promise<GraniteValidationResult> => {
  const formData = new FormData();
  const { filename, mimeType } = resolveImageMimeAndName(uri, 'photo.jpg', explicitName, explicitMime);
  formData.append('file', {
    uri,
    name: filename,
    type: mimeType,
  } as any);

  const response = await apiClient.post<GraniteValidationResult>('/capture/validate-granite', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: UPLOAD_TIMEOUT_MS,
  });
  return response.data;
};

export const createCaptureSession = async (
  blockId: number | string,
  officerName = 'Officer',
  stage: 'RAW' | 'POST_DRESSING' | string = 'RAW'
) => {
  const response = await apiClient.post(
    `/capture/sessions?block_id=${blockId}&officer_name=${encodeURIComponent(officerName)}&stage=${encodeURIComponent(stage)}`
  );
  return response.data;
};

export interface EvidenceMetadataPayload {
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  gpsAccuracyM?: number | null;
  capturedAt?: string | null;
  captureSource?: string;
}

export const uploadSessionImage = async (
  sessionId: number,
  uri: string,
  sequenceNumber = 0,
  forceAccept = false,
  explicitName?: string,
  explicitMime?: string,
  metadata?: EvidenceMetadataPayload
) => {
  const formData = new FormData();
  const { filename, mimeType } = resolveImageMimeAndName(
    uri,
    `img_${sequenceNumber}.jpg`,
    explicitName,
    explicitMime
  );
  formData.append('file', {
    uri,
    name: filename,
    type: mimeType,
  } as any);

  if (metadata?.gpsLatitude != null) {
    formData.append('gps_latitude', String(metadata.gpsLatitude));
  }
  if (metadata?.gpsLongitude != null) {
    formData.append('gps_longitude', String(metadata.gpsLongitude));
  }
  if (metadata?.gpsAccuracyM != null) {
    formData.append('gps_accuracy_m', String(metadata.gpsAccuracyM));
  }
  if (metadata?.capturedAt) {
    formData.append('captured_at', metadata.capturedAt);
  }
  if (metadata?.captureSource) {
    formData.append('capture_source', metadata.captureSource);
  }

  const url = `/capture/sessions/${sessionId}/images?sequence_number=${sequenceNumber}${forceAccept ? '&force_accept=true' : ''}`;
  const response = await apiClient.post(
    url,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT_MS,
    }
  );
  return response.data;
};

export const completeCaptureSession = async (sessionId: number) => {
  const response = await apiClient.post(`/capture/sessions/${sessionId}/complete`);
  return response.data;
};

export const startAnalysisJob = async (blockId: number | string, stage: string = 'RAW') => {
  const response = await apiClient.post(`/analysis/jobs?block_id=${blockId}&stage=${encodeURIComponent(stage)}`);
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

export const listAnalysisJobs = async (blockId: number | string) => {
  const response = await apiClient.get(`/analysis/?block_id=${blockId}`);
  return response.data as AnalysisJobStatus[];
};

export const getMeasurementGeometry = async (blockId: number | string) => {
  const response = await apiClient.get(`/measurements/${blockId}/geometry`);
  return response.data;
};

export const recordPhysicalReference = async (
  blockId: number | string,
  payload: {
    tape_length_cm?: number;
    tape_breadth_cm?: number;
    tape_height_cm?: number;
    marker_size_cm_verified?: number;
    weight_mt?: number;
    recorded_by?: string;
    notes?: string;
  }
) => {
  const response = await apiClient.post(`/validation/${blockId}/reference`, payload);
  return response.data;
};

export const getPhysicalComparison = async (blockId: number | string) => {
  const response = await apiClient.get(`/validation/${blockId}`);
  return response.data;
};
