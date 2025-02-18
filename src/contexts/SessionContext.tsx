// src/contexts/SessionContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
} from 'react';
import { ChatSession } from '@/components/sidebar/session-item';
import { sessionStore, StoredSession } from '@/lib/session-store';
import { useUser } from '@clerk/clerk-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
  
interface SessionContextState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  loading: boolean;
  error: string | null;
  createSession: () => Promise<string | null>;
  selectSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => Promise<void>;
}
  
// Create the context with default values (including no-op functions)
const SessionContext = createContext<SessionContextState>({
  sessions: [],
  currentSessionId: null,
  loading: false,
  error: null,
  createSession: () => Promise.resolve(null),
  selectSession: () => {},
  deleteSession: () => Promise.resolve(),
  updateSession: () => Promise.resolve(),
});
  
// Provider component
export const SessionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user } = useUser();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Stable reference for navigation
  const navigateToSession = useCallback((sessionId: string) => {
    navigate(`/session/${sessionId}`);
  }, [navigate]);

  // Load sessions (using useCallback for stability)
  const loadSessions = useCallback(async () => {
    if (user?.id) {
      setLoading(true);
      setError(null);
      try {
        const storedSessions = await sessionStore.getUserSessions(user.id);
        const formattedSessions = storedSessions.map(formatSession);
        setSessions(formattedSessions);
        // Set active session if none is set and there are sessions
        if (formattedSessions.length > 0 && !currentSessionId) {
          setCurrentSessionId(formattedSessions[0].id);
          navigateToSession(formattedSessions[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    }
  }, [user?.id, navigate, currentSessionId]);

  // Load sessions on mount and whenever the user changes
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // Create a new session (async, uses API)
  const createSession = useCallback(async (): Promise<string | null> => {
    if (!user?.id) return null;
    setLoading(true);
    setError(null);
    try {
      const newSession = await sessionStore.addSession(user.id);
      const formattedSession = formatSession(newSession);

      // Update the sessions state *optimistically* (before navigation)
      setSessions((prevSessions) => [formattedSession, ...prevSessions]);
      setCurrentSessionId(newSession.id);
      navigateToSession(newSession.id);
      return newSession.id;
    } catch (err: any) {
      setError(err.message || 'Failed to create session');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, navigateToSession]);

  // Select a session (just sets the active session ID)
  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  // Delete a session (async, uses API)
  const deleteSession = useCallback(async (sessionId: string) => {
    setLoading(true);
    setError(null);
    try {
      await sessionStore.deleteSession(sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
      // Refetch sessions after deleting
      await loadSessions();
    } catch (err: any) {
      setError(err.message || 'Failed to delete session');
    } finally {
      setLoading(false);
    }
  }, [currentSessionId, loadSessions]);

  // Update a session (async, uses API)
  const updateSession = useCallback(async (sessionId: string, updates: Partial<StoredSession>) => {
    setLoading(true);
    setError(null);
    try {
      await sessionStore.updateSession(sessionId, updates);
      // Refetch all sessions after updating
      await loadSessions();
    } catch (err: any) {
      setError(err.message || 'Failed to update session');
    } finally {
      setLoading(false);
    }
  }, [loadSessions]);

  // Memoize the sessions array to prevent unnecessary re-renders
  const memoizedSessions = useMemo(() => {
    return sessions.map((s) => ({
      ...s,
      isActive: s.id === currentSessionId,
    }));
  }, [sessions, currentSessionId]);

  // Memoize the handlers separately to maintain stable references
  const memoizedHandlers = useMemo(() => ({
    createSession,
    selectSession,
    deleteSession,
    updateSession,
  }), [createSession, selectSession, deleteSession, updateSession]);

  // Create the context value, memoizing it to prevent unnecessary re-renders
  const contextValue: SessionContextState = useMemo(() => ({
    sessions: memoizedSessions,
    currentSessionId,
    loading,
    error,
    ...memoizedHandlers,
  }), [memoizedSessions, currentSessionId, loading, error, createSession, selectSession, deleteSession, updateSession]);

  return (
    <SessionContext.Provider value={contextValue}>
      {children}
    </SessionContext.Provider>
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

// Helper function to format a session (stays outside the hook)
function formatSession(session: StoredSession): ChatSession {
  return {
    id: session.id,
    title: session.title || 'New Chat',
    timestamp: formatDistanceToNow(new Date(session.timestamp), { addSuffix: true }),
  };
}
