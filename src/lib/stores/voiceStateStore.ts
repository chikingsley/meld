import { create } from 'zustand';
import { VoiceStatus, VoiceError } from '@/lib/hume-lib/contexts/VoiceContext';

interface VoiceState {
  status: VoiceStatus;
  error: VoiceError | null;
  isPaused: boolean;
  setStatus: (status: VoiceStatus) => void;
  setError: (error: VoiceError | null) => void;
  setIsPaused: (isPaused: boolean) => void;
}

export const useVoiceStateStore = create<VoiceState>((set) => ({
  status: { value: 'disconnected' },
  error: null,
  isPaused: false,
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setIsPaused: (isPaused) => set({ isPaused })
}));
