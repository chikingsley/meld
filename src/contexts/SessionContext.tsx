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
import { sessionStore, StoredSession } from '@/db/session-store';
import { useUser } from '@clerk/clerk-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, useParams } from 'react-router-dom';
  
interface SessionContextState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  loading: boolean;
  error: string | null;
  isVoiceMode: boolean;
  setVoiceMode: (isVoice: boolean) => void;
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
  isVoiceMode: true,
  setVoiceMode: () => {},
  createSession: () => Promise.resolve(null),
  selectSession: () => {},
  deleteSession: () => Promise.resolve(),
  updateSession: () => Promise.resolve(),
});
  
// Provider component
export const SessionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user, isLoaded: userLoaded } = useUser();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(true);
  const navigate = useNavigate();

  // Stable reference for navigation
  const navigateToSession = useCallback((sessionId: string) => {
    navigate(`/session/${sessionId}`);
  }, [navigate]);

  // Create a new session (async, uses API)
  const createSession = useCallback(async (): Promise<string | null> => {
    if (!userLoaded) {
      console.log('[SessionContext] Waiting for Clerk user to load...');
      return null;
    }
    
    if (!user?.id) {
      console.log('[SessionContext] No user ID available');
      setError('You must be logged in to create a session');
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('[SessionContext] Creating session for user:', user.id);
      const newSession = await sessionStore.addSession();
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

  // Load sessions (using useCallback for stability)
  const loadSessions = useCallback(async () => {
    if (userLoaded && user?.id) {
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
  }, [user?.id, navigate, currentSessionId, userLoaded]);



  // Get URL session ID
  const { sessionId: urlSessionId } = useParams();

  // Handle URL and session synchronization
  useEffect(() => {
    if (!userLoaded || !user?.id) return;

    const handleUrlSession = async () => {
      // If we have a URL session ID, try to select it
      if (urlSessionId) {
        const session = sessions.find(s => s.id === urlSessionId);
        if (session) {
          setCurrentSessionId(urlSessionId);
        } else {
          // Invalid session ID - redirect to first available or create new
          if (sessions.length > 0) {
            navigateToSession(sessions[0].id);
          } else {
            await createSession();
          }
        }
        return;
      }

      // No URL session ID
      if (sessions.length === 0) {
        // No sessions exist - create new
        await createSession();
      } else if (!currentSessionId) {
        // Have sessions but none selected - select first
        navigateToSession(sessions[0].id);
      }
    };

    handleUrlSession();
  }, [urlSessionId, sessions, user?.id, currentSessionId, navigateToSession, createSession, userLoaded]);

  // Load sessions on mount and whenever the user changes
  useEffect(() => {
    loadSessions();
  }, [loadSessions, userLoaded]);



  // Select a session and update URL
  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    navigateToSession(sessionId);
  }, [navigateToSession]);

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
      // Ensure timestamp is present in updates
      const updatesWithTimestamp = {
        ...updates,
        timestamp: updates.timestamp || new Date().toISOString()
      };
      
      await sessionStore.updateSession(sessionId, updatesWithTimestamp);
      
      // Update locally instead of reloading all sessions
      setSessions(prev => prev.map(session => {
        if (session.id !== sessionId) return session;
        
        // Get the stored session to ensure we have all required fields
        const storedSession = sessionStore.getSessions().find(s => s.id === sessionId);
        if (!storedSession) return session;
        
        // Create complete session object for formatting
        const updatedSession: StoredSession = {
          ...storedSession,
          ...updatesWithTimestamp,
        };
        
        return formatSession(updatedSession);
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to update session');
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Effect to handle mode changes
  useEffect(() => {
    if (currentSessionId) {
      const basePath = '/session';
      navigate(`${basePath}/${currentSessionId}`);
    }
  }, [isVoiceMode, currentSessionId, navigate]);

  // Create the context value, memoizing it to prevent unnecessary re-renders
  const contextValue: SessionContextState = useMemo(() => ({
    sessions: memoizedSessions,
    currentSessionId,
    loading,
    error,
    isVoiceMode,
    setVoiceMode: setIsVoiceMode,
    ...memoizedHandlers,
  }), [memoizedSessions, currentSessionId, loading, error, isVoiceMode, memoizedHandlers]);

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
  let timestamp = 'Just now';
  try {
    if (session.timestamp) {
      const date = new Date(session.timestamp);
      if (!isNaN(date.getTime())) {
        timestamp = formatDistanceToNow(date, { addSuffix: true });
      }
    }
  } catch (err) {
    console.warn('Failed to format timestamp:', err);
  }

  return {
    id: session.id,
    title: session.title || 'New Chat',
    timestamp,
  };
}
