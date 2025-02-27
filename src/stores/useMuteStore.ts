// src/stores/useMuteStore.ts
import { create } from 'zustand';

interface MuteState {
  isMicMuted: boolean;
  isAudioMuted: boolean;
  setMicMuted: (muted: boolean) => void;
  setAudioMuted: (muted: boolean) => void;
  mute: () => void;
  unmute: () => void;
}

export const useMuteStore = create<MuteState>((set) => ({
  isMicMuted: false,
  isAudioMuted: false,
  setMicMuted: (muted) => set({ isMicMuted: muted }),
  setAudioMuted: (muted) => set({ isAudioMuted: muted }),
  mute: () => set({ isMicMuted: true }),  // Just update state, useMicrophone will handle the actual mic control
  unmute: () => set({ isMicMuted: false })  // Just update state, useMicrophone will handle the actual mic control
}));
