import { useVoice } from "@/lib/hume-lib/VoiceProvider";
import React, { createContext, useContext, useCallback } from "react";

interface VoiceCleanupProps {
  children: React.ReactNode;
  onCreateSession: () => Promise<void>;
  onSelectSession: (id: string) => Promise<void>;
  onDeleteSession: (id: string) => Promise<void>;
}

interface VoiceCleanupHandlers {
  handleCreateSession: () => Promise<void>;
  handleSelectSession: (id: string) => Promise<void>;
  handleDeleteSession: (id: string) => Promise<void>;
}

const VoiceCleanupContext = createContext<VoiceCleanupHandlers | null>(null);

export const useVoiceCleanupHandlers = () => {
  const context = useContext(VoiceCleanupContext);
  if (!context) {
    throw new Error('useVoiceCleanupHandlers must be used within a VoiceCleanupWrapper');
  }
  return context;
};

export const useVoiceCleanup = () => {
  const { status, disconnect, clearMessages } = useVoice();

  const cleanup = useCallback(async () => {
    if (status.value === 'connected') {
      await disconnect();
    }
    clearMessages();
  }, [status.value, disconnect, clearMessages]);

  return { cleanup };
};

export const VoiceCleanupWrapper: React.FC<VoiceCleanupProps> = ({
  onCreateSession,
  onSelectSession,
  onDeleteSession,
  children
}) => {
  const { cleanup } = useVoiceCleanup();

  // Wrap the session operations with voice cleanup
  const wrappedHandlers = React.useMemo(() => ({
    handleCreateSession: async () => {
      await cleanup();
      await onCreateSession();
    },
    handleSelectSession: async (id: string) => {
      await cleanup();
      await onSelectSession(id);
    },
    handleDeleteSession: async (id: string) => {
      await cleanup();
      await onDeleteSession(id);
    },
  }), [cleanup, onCreateSession, onSelectSession, onDeleteSession]);

  return (
    <VoiceCleanupContext.Provider value={wrappedHandlers}>
      {children}
    </VoiceCleanupContext.Provider>
  );
};
