// src/lib/hume-lib/contexts/VoiceMessagesContext.tsx
import React, { createContext, useContext, useMemo } from 'react';
import type { JSONMessage } from '../models/messages';
import type { ConnectionMessage } from '../connection-message';

interface VoiceMessagesContextState {
  messages: Array<JSONMessage | ConnectionMessage>;
  lastVoiceMessage: JSONMessage | null;
  lastUserMessage: JSONMessage | null;
}

export const VoiceMessagesContext = createContext<VoiceMessagesContextState | null>(null);

export const VoiceMessagesProvider: React.FC<{
  children: React.ReactNode;
  messages: Array<JSONMessage | ConnectionMessage>;
  lastVoiceMessage: JSONMessage | null;
  lastUserMessage: JSONMessage | null;
}> = ({ children, messages, lastVoiceMessage, lastUserMessage }) => {
  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      messages,
      lastVoiceMessage,
      lastUserMessage,
    }),
    [messages, lastVoiceMessage, lastUserMessage]
  );

  return (
    <VoiceMessagesContext.Provider value={value}>
      {children}
    </VoiceMessagesContext.Provider>
  );
};

export const useVoiceMessages = () => {
  const context = useContext(VoiceMessagesContext);
  if (!context) {
    throw new Error(
      'useVoiceMessages must be used within a VoiceMessagesProvider'
    );
  }
  return context;
};