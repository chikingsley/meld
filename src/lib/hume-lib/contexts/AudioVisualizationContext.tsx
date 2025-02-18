// src/lib/hume-lib/contexts/AudioVisualizationContext.tsx
import React, { createContext, useContext, useMemo } from 'react';

interface AudioVisualizationContextState {
  fft: number[];
  micFft: number[];
}

const AudioVisualizationContext = createContext<AudioVisualizationContextState | null>(null);

export const AudioVisualizationProvider: React.FC<{
  children: React.ReactNode;
  fft: number[];
  micFft: number[];
}> = ({ children, fft, micFft }) => {
  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      fft,
      micFft,
    }),
    [fft, micFft]
  );

  return (
    <AudioVisualizationContext.Provider value={value}>
      {children}
    </AudioVisualizationContext.Provider>
  );
};

export const useAudioVisualization = () => {
  const context = useContext(AudioVisualizationContext);
  if (!context) {
    throw new Error(
      'useAudioVisualization must be used within an AudioVisualizationProvider'
    );
  }
  return context;
};