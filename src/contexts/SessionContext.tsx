// src/contexts/SessionContext.tsx
import React, {
    createContext,
    useContext,
    ReactNode,
    useCallback,
    useMemo,
  } from 'react';
  import { ChatSession } from '@/components/sidebar/nav-sessions';
  import { useSessions } from '@/hooks/use-sessions';
  import { useNavigate } from 'react-router-dom';
  import { useVoice } from '@/lib/hume-lib/VoiceProvider';
  
  interface SessionContextState {
    sessions: ChatSession[];
    currentSessionId: string | null;
    createSession: () => string | null;
    selectSession: (sessionId: string) => void;
    deleteSession: (sessionId: string) => void;
    updateSession: (sessionId: string, updates: Partial<ChatSession>) => void;
    isVoiceConnected: boolean;
    voiceError: string | null;
  }
  
  // Create the context with a default state. Provide NO-OP functions.
  const SessionContext = createContext<SessionContextState>({
    sessions: [],
    currentSessionId: null,
    createSession: () => null,
    selectSession: () => {},
    deleteSession: () => {},
    updateSession: () => {},
    isVoiceConnected: false,
    voiceError: null,
  });
  
  // Provider component
  export const SessionProvider: React.FC<{ children: ReactNode }> = ({
    children,
  }) => {
    const {
      sessions,
      activeSessionId,
      createSession,
      selectSession,
      deleteSession,
      updateSession,
    } = useSessions();
    const navigate = useNavigate();
    const { status, error } = useVoice();
  
    // Wrap all actions with useCallback for memoization.
    const createSessionWrapper = useCallback(() => {
      const newSessionId = createSession();
      if (newSessionId) {
        console.log(`[SessionContext] Created new session: ${newSessionId}`);
        navigate(`/session/${newSessionId}`);
      }
      return newSessionId;
    }, [createSession, navigate]);
  
    const selectSessionWrapper = useCallback(
      (sessionId: string) => {
        console.log(`[SessionContext] Selecting session: ${sessionId}`);
        selectSession(sessionId);
        navigate(`/session/${sessionId}`);
      },
      [selectSession, navigate],
    );
  
    const deleteSessionWrapper = useCallback(
      (sessionId: string) => {
        console.log(`[SessionContext] Deleting session: ${sessionId}`);
        deleteSession(sessionId);
      },
      [deleteSession],
    );
  
    const updateSessionWrapper = useCallback(
      (sessionId: string, updates: Partial<ChatSession>) => {
        console.log(`[SessionContext] Updating session: ${sessionId}`, updates);
        updateSession(sessionId, updates);
      },
      [updateSession],
    );
  
    // Use useMemo to prevent unnecessary re-renders of the context value.
    const value: SessionContextState = useMemo(
      () => ({
        sessions,
        currentSessionId: activeSessionId,
        createSession: createSessionWrapper,
        selectSession: selectSessionWrapper,
        deleteSession: deleteSessionWrapper,
        updateSession: updateSessionWrapper,
        isVoiceConnected: status.value === 'connected',
        voiceError: error?.message || null,
      }),
      [
        sessions,
        activeSessionId,
        createSessionWrapper,
        selectSessionWrapper,
        deleteSessionWrapper,
        updateSessionWrapper,
        status.value,
        error?.message,
      ],
    );
  
    return (
      <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
    );
  };
  
  // Custom hook to use the context
  export const useSessionContext = () => {
    const context = useContext(SessionContext);
    if (!context) {
      throw new Error(
        'useSessionContext must be used within a SessionProvider',
      );
    }
    return context;
  };