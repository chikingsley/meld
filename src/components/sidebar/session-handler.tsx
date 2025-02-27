// src/components/sidebar/session-handler.tsx
import { useVoice } from "@/providers/VoiceProvider";
import React, { createContext, useContext, useCallback } from "react";

interface SessionHandlerProps {
  children: React.ReactNode;
  onCreateSession: () => Promise<void>;
  onSelectSession: (id: string) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
}

interface SessionHandlers {
  handleCreateSession: () => Promise<void>;
  handleSelectSession: (id: string) => Promise<void>;
  handleDeleteSession: (id: string) => Promise<void>;
}

const SessionHandlerContext = createContext<SessionHandlers | null>(null);

export const useSessionHandlers = () => {
  const context = useContext(SessionHandlerContext);
  if (!context) {
    throw new Error('useSessionHandlers must be used within a SessionHandlerWrapper');
  }
  return context;
};

export const useVoiceDisconnect = () => {
  const { status, disconnect } = useVoice();
  
  const disconnectVoice = useCallback(async () => {
    if (status.value === 'connected') {
      await disconnect();
    }
  }, [status.value, disconnect]);
  
  return { disconnectVoice };
};

export const SessionHandlerWrapper: React.FC<SessionHandlerProps> = ({
  onCreateSession,
  onSelectSession,
  onDeleteSession,
  children
}) => {
  const { disconnectVoice } = useVoiceDisconnect();
  
  // Wrap the session operations with voice disconnect
  const sessionHandlers = React.useMemo(() => ({
    handleCreateSession: async () => {
      await disconnectVoice();
      await onCreateSession();
    },
    handleSelectSession: async (id: string) => {
      await disconnectVoice();
      await onSelectSession(id);
    },
    handleDeleteSession: async (id: string) => {
      await disconnectVoice();
      await onDeleteSession(id);
    },
  }), [disconnectVoice, onCreateSession, onSelectSession, onDeleteSession]);

  return (
    <SessionHandlerContext.Provider value={sessionHandlers}>
      {children}
    </SessionHandlerContext.Provider>
  );
};