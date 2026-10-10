import { create } from 'zustand';

export interface UserProfile {
  id: number | string;
  name: string;
  username: string;
  role: string;
  token: string;
}

interface AuthState {
  user: UserProfile | null;
  login: (user: UserProfile) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    id: 2,
    name: 'Mining Officer Rao',
    username: 'officer',
    role: 'Officer',
    token: 'dev-token-officer',
  },
  login: (user) => set({ user }),
  logout: () => set({ user: null }),
}));
