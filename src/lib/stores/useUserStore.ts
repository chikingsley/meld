import { create } from 'zustand';

interface UserState {
  configId: string | null;
  setConfigId: (id: string | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  configId: null,
  setConfigId: (id) => set({ configId: id }),
}));
