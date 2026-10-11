import { create } from 'zustand';
import { storage } from '../services/storage';

export interface UserProfile {
  id: number | string;
  name: string;
  username: string;
  role: string;
  token: string;
}

interface AuthState {
  user: UserProfile | null;
  activeQuarryId: number | null;
  activeQuarryName: string | null;
  login: (user: UserProfile) => void;
  logout: () => void;
  switchRole: (role: string) => void;
  updateIdentityName: (name: string) => void;
  setActiveQuarry: (id: number | null, name?: string | null) => void;
}

const AUTH_STORAGE_KEY = 'granitemeasure_user_auth_v1';
const QUARRY_STORAGE_KEY = 'granitemeasure_active_quarry_v1';

const DEFAULT_USER: UserProfile = {
  id: 2,
  name: 'Mining Officer (Demo)',
  username: 'officer',
  role: 'Officer',
  token: 'dev-token-officer',
};

export const useAuthStore = create<AuthState>((set, get) => {
  // Load persisted user & quarry asynchronously on module import
  storage.getItem(AUTH_STORAGE_KEY).then((raw) => {
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.role) {
          set({ user: parsed });
        }
      } catch {}
    }
  });

  storage.getItem(QUARRY_STORAGE_KEY).then((raw) => {
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        set({ activeQuarryId: parsed.id, activeQuarryName: parsed.name });
      } catch {}
    }
  });

  return {
    user: DEFAULT_USER,
    activeQuarryId: 1,
    activeQuarryName: 'Chimakkurthy Galaxy Pit #4',

    login: (user) => {
      set({ user });
      storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user)).catch(() => {});
    },

    logout: () => {
      set({ user: null });
      storage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
    },

    switchRole: (role: string) => {
      const current = get().user || DEFAULT_USER;
      const updated: UserProfile = {
        ...current,
        role,
        username: role.toLowerCase().replace(/\s+/g, '_'),
      };
      set({ user: updated });
      storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    },

    updateIdentityName: (name: string) => {
      const current = get().user || DEFAULT_USER;
      const updated: UserProfile = {
        ...current,
        name: name.trim() || 'Officer',
      };
      set({ user: updated });
      storage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
    },

    setActiveQuarry: (id: number | null, name: string | null = null) => {
      set({ activeQuarryId: id, activeQuarryName: name });
      if (id !== null) {
        storage.setItem(QUARRY_STORAGE_KEY, JSON.stringify({ id, name })).catch(() => {});
      } else {
        storage.removeItem(QUARRY_STORAGE_KEY).catch(() => {});
      }
    },
  };
});
