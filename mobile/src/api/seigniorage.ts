import { apiClient } from './client';

export interface SeigniorageCalculationRequest {
  color_group: string;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  weight_mt?: number;
  density_kg_m3?: number;
  block_id?: string;
  measurement_source?: string;
}

export interface SeigniorageResult {
  color_group: string;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  volume_m3: number;
  volume_basis?: string;
  weight_mt: number;
  weight_source: string;
  mass_kind?: string;
  is_above_gangsaw: boolean;
  classification: string;
  classification_rule?: {
    mode?: string;
    description?: string;
    pending_departmental_confirmation?: boolean;
  };
  rate_per_mt: number;
  indicative_seigniorage: number;
  rate_version: string;
  measurement_source: string;
  indicative?: boolean;
  disclaimer: string;
}

export interface RateItem {
  color_group: string;
  above_gangsaw_rate: number;
  below_gangsaw_rate: number;
  unit: string;
}

export interface RatesResponse {
  rates: RateItem[];
  classification_threshold: {
    length_cm: number;
    width_cm: number;
    description: string;
  };
  rate_version: string;
  disclaimer: string;
}

export const calculateSeigniorage = async (data: SeigniorageCalculationRequest): Promise<SeigniorageResult> => {
  const response = await apiClient.post<SeigniorageResult>('/seigniorage/calculate', data);
  return response.data;
};

export const getSeigniorageRates = async (): Promise<RatesResponse> => {
  const response = await apiClient.get<RatesResponse>('/seigniorage/rates');
  return response.data;
};
