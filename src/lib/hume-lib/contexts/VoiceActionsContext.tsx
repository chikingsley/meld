// src/lib/hume-lib/contexts/VoiceActionsContext.tsx
import React, { createContext, useContext } from 'react';
import { type Hume } from 'hume';

interface VoiceActionsContextState {
  connect: () => Promise<void>;
  disconnect: () => void;
  mute: () => void;
  unmute: () => void;
  sendUserInput: (text: string) => void;
  clearMessages: () => void;
  sendSessionSettings: (sessionSettings: Hume.empathicVoice.SessionSettings) => void;
}

export const VoiceActionsContext = createContext<VoiceActionsContextState | null>(null);

export const VoiceActionsProvider: React.FC<{
  children: React.ReactNode;
  actions: VoiceActionsContextState;
}> = ({ children, actions }) => {
  return (
    <VoiceActionsContext.Provider value={actions}>
      {children}
    </VoiceActionsContext.Provider>
  );
};

export const useVoiceActions = () => {
  const context = useContext(VoiceActionsContext);
  if (!context) {
    throw new Error(
      'useVoiceActions must be used within a VoiceActionsProvider'
    );
  }
  return context;
};