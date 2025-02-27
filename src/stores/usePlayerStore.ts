// src/stores/usePlayerStore.ts
import { create } from 'zustand';

interface PlayerState {
  isPlaying: boolean;
  clipQueue: Array<{id: string; buffer: AudioBuffer}>;
  currentlyPlayingAudioBuffer: AudioBufferSourceNode | null;
  setIsPlaying: (playing: boolean) => void;
  addToQueue: (clip: {id: string; buffer: AudioBuffer}) => void;
  clearQueue: () => void;
  setCurrentlyPlayingAudioBuffer: (buffer: AudioBufferSourceNode | null) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  clipQueue: [],
  currentlyPlayingAudioBuffer: null,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  addToQueue: (clip) => set((state) => ({ 
    clipQueue: [...state.clipQueue, clip]
  })),
  clearQueue: () => set({ 
    clipQueue: [],
    currentlyPlayingAudioBuffer: null,
    isPlaying: false 
  }),
  setCurrentlyPlayingAudioBuffer: (buffer) => set({
    currentlyPlayingAudioBuffer: buffer
  })
}));
