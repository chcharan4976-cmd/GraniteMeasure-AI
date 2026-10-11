import { apiClient } from './client';

export interface QuarryItem {
  id: number;
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
  is_active?: boolean;
  status?: string;
  active_blocks_count?: number;
  notes?: string;
  created_at?: string;
}

export const getQuarries = async (): Promise<QuarryItem[]> => {
  const response = await apiClient.get<QuarryItem[]>('/quarries/');
  return response.data;
};

export const getQuarry = async (id: number | string): Promise<QuarryItem> => {
  const response = await apiClient.get<QuarryItem>(`/quarries/${id}`);
  return response.data;
};

export const createQuarry = async (data: Partial<QuarryItem>): Promise<QuarryItem> => {
  const response = await apiClient.post<QuarryItem>('/quarries/', data);
  return response.data;
};

export const updateQuarry = async (id: number | string, data: Partial<QuarryItem>): Promise<QuarryItem> => {
  const response = await apiClient.put<QuarryItem>(`/quarries/${id}`, data);
  return response.data;
};
