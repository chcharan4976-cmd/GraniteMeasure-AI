import { create } from 'zustand';
import { storage } from '../services/storage';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  simpleMode: boolean;
  language: 'en' | 'te';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setSimpleMode: (simpleMode: boolean) => void;
  setLanguage: (language: 'en' | 'te') => void;
  toggleSimpleMode: () => void;
}

const SETTINGS_STORAGE_KEY = 'granitemeasure_settings_v2';

export const useSettingsStore = create<SettingsState>((set, get) => {
  // Load settings on startup
  storage.getItem(SETTINGS_STORAGE_KEY).then((raw) => {
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        set({
          theme: parsed.theme || 'light',
          simpleMode: parsed.simpleMode !== undefined ? parsed.simpleMode : false,
          language: parsed.language || 'en',
        });
      } catch {}
    }
  });

  const saveSettings = (updated: Partial<SettingsState>) => {
    const current = get();
    const data = {
      theme: updated.theme ?? current.theme,
      simpleMode: updated.simpleMode ?? current.simpleMode,
      language: updated.language ?? current.language,
    };
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  };

  return {
    theme: 'light',
    simpleMode: false,
    language: 'en',

    setTheme: (theme) => {
      set({ theme });
      saveSettings({ theme });
    },

    setSimpleMode: (simpleMode) => {
      set({ simpleMode });
      saveSettings({ simpleMode });
    },

    setLanguage: (language) => {
      set({ language });
      saveSettings({ language });
    },

    toggleSimpleMode: () => {
      const next = !get().simpleMode;
      set({ simpleMode: next });
      saveSettings({ simpleMode: next });
    },
  };
});
