// src/contexts/SessionContext.tsx
import React, {
    createContext,
    useContext,
    useReducer,
    ReactNode,
    useCallback,
    useEffect,
    useMemo,
  } from 'react';
  import { ChatSession } from '@/components/sidebar/nav-sessions';
  import { useSessions } from '@/hooks/use-sessions'; // Import useSessions
  import { useNavigate } from 'react-router-dom';
  
  interface SessionContextState {
    sessions: ChatSession[];
    currentSessionId: string | null;
    createSession: () => string | null;
    selectSession: (sessionId: string) => void;
    deleteSession: (sessionId: string) => void;
    updateSession: (sessionId: string, updates: Partial<ChatSession>) => void;
  }
  
  // Create the context with a default state. Provide NO-OP functions.
  const SessionContext = createContext<SessionContextState>({
    sessions: [],
    currentSessionId: null,
    createSession: () => null, // No-op function
    selectSession: () => {}, // No-op function
    deleteSession: () => {}, // No-op function
    updateSession: () => {}, // No-op function
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
    } = useSessions(); // Use the useSessions hook
      const navigate = useNavigate();
  
  
    // Wrap all actions with useCallback for memoization.
    const createSessionWrapper = useCallback(() => {
      const newSessionId = createSession();
      if (newSessionId) {
          navigate(`/session/${newSessionId}`); // Navigate on session creation
        }
      return newSessionId
    }, [createSession, navigate]);
  
    const selectSessionWrapper = useCallback(
      (sessionId: string) => {
        selectSession(sessionId);
        navigate(`/session/${sessionId}`); // Navigate on session selection
  
      },
      [selectSession, navigate],
    );
  
    const deleteSessionWrapper = useCallback(
      (sessionId: string) => {
        deleteSession(sessionId);
        // No need to navigate here; useSessions handles creating a new session
        // if the deleted session was active.
      },
      [deleteSession],
    );
  
    const updateSessionWrapper = useCallback(
      (sessionId: string, updates: Partial<ChatSession>) => {
        updateSession(sessionId, updates);
      },
      [updateSession],
    );
  
    // Use useMemo to prevent unnecessary re-renders of the context value.
    const value: SessionContextState = useMemo(
      () => ({
        sessions: sessions,
        currentSessionId: activeSessionId, // Renamed for clarity
        createSession: createSessionWrapper,
        selectSession: selectSessionWrapper,
        deleteSession: deleteSessionWrapper,
        updateSession: updateSessionWrapper,
      }),
      [
        sessions,
        activeSessionId,
        createSessionWrapper,
        selectSessionWrapper,
        deleteSessionWrapper,
        updateSessionWrapper,
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