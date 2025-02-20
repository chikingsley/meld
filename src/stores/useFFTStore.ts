// src/lib/audio/stores/fftStore.ts
import { create } from 'zustand';
import { generateEmptyFft } from '@/lib/generateEmptyFTT';

interface FFTState {
  playerFft: number[];
  micFft: number[];
  setPlayerFft: (fft: number[]) => void;
  setMicFft: (fft: number[]) => void;
}

export const useFFTStore = create<FFTState>((set) => ({
  playerFft: generateEmptyFft(),
  micFft: generateEmptyFft(),
  setPlayerFft: (fft) => set({ playerFft: fft }),
  setMicFft: (fft) => set({ micFft: fft })
}));