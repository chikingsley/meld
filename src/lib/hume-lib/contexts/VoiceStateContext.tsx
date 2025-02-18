// src/lib/hume-lib/contexts/VoiceStateContext.tsx
import React, { createContext, useContext, useMemo } from 'react';

interface VoiceError {
  message: string;
  code?: string;
}

type VoiceStatus =
  | {
      value: 'disconnected' | 'connecting' | 'connected';
      reason?: undefined;
    }
  | {
      value: 'error';
      reason: string;
    };

interface VoiceStateContextState {
  status: VoiceStatus;
  error: VoiceError | null;
  isMuted: boolean;
  isPlaying: boolean;
  isPaused: boolean;
}

export const VoiceStateContext = createContext<VoiceStateContextState | null>(null);

export const VoiceStateProvider: React.FC<{
  children: React.ReactNode;
  status: VoiceStatus;
  error: VoiceError | null;
  isMuted: boolean;
  isPlaying: boolean;
  isPaused: boolean;
}> = ({ children, status, error, isMuted, isPlaying, isPaused }) => {
  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      status,
      error,
      isMuted,
      isPlaying,
      isPaused,
    }),
    [status, error, isMuted, isPlaying, isPaused]
  );

  return (
    <VoiceStateContext.Provider value={value}>
      {children}
    </VoiceStateContext.Provider>
  );
};

export const useVoiceState = () => {
  const context = useContext(VoiceStateContext);
  if (!context) {
    throw new Error(
      'useVoiceState must be used within a VoiceStateProvider'
    );
  }
  return context;
};