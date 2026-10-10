import { apiClient } from './client';

export interface QuarryItem {
  id: number;
  name: string;
  code?: string;
  lease_reference?: string;
  district?: string;
  mandal?: string;
  village?: string;
  granite_category?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  is_active: boolean;
}

export const getQuarries = async (): Promise<QuarryItem[]> => {
  const response = await apiClient.get<QuarryItem[]>('/quarries/');
  return response.data;
};

export const createQuarry = async (data: Partial<QuarryItem>): Promise<QuarryItem> => {
  const response = await apiClient.post<QuarryItem>('/quarries/', data);
  return response.data;
};
