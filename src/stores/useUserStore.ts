import { create } from 'zustand';

interface UserState {
  configId: string | null;
  userId: string | null;
  token: string | null;
  setConfigId: (id: string | null) => void;
  setUserId: (id: string | null) => void;
  setToken: (token: string | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  configId: null,
  userId: null,
  token: null,
  setConfigId: (id) => set({ configId: id }),
  setUserId: (id) => set({ userId: id }),
  setToken: (token) => set({ token }),
}));
