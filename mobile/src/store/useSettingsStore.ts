import { create } from 'zustand';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'system',
  setTheme: (theme) => set({ theme }),
}));
