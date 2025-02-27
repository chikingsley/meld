// src/providers/SessionProvider.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { ChatSession } from '@/components/sidebar/session-item';
import { sessionStore, StoredSession } from '@/db/session-store';
import { useUser } from '@clerk/clerk-react';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { SessionError, createSessionError } from '@/utils/error-handling';

interface SessionContextState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  loading: boolean;
  error: SessionError | null;
  isInitialized: boolean;
  isVoiceMode: boolean;
  setVoiceMode: (isVoice: boolean) => void;
  createSession: () => Promise<string | null>;
  selectSession: (sessionId: string) => void;
  deleteSession: (sessionId: string) => Promise<void>;
  updateSession: (sessionId: string, updates: Partial<ChatSession>) => Promise<void>;
}

const SessionContext = createContext<SessionContextState>({
  sessions: [],
  currentSessionId: null,
  loading: false,
  error: null,
  isInitialized: false,
  isVoiceMode: true,
  setVoiceMode: () => {},
  createSession: () => Promise.resolve(null),
  selectSession: () => {},
  deleteSession: () => Promise.resolve(),
  updateSession: () => Promise.resolve(),
});

export const SessionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user, isLoaded: userLoaded } = useUser();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<SessionError | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Refs for operation locks
  const initializationLock = useRef<boolean>(false);
  const sessionCreationLock = useRef<boolean>(false);
  const sessionDeletionLock = useRef<boolean>(false);

  // Stable navigation function
  const navigateToSession = useCallback((sessionId: string) => {
    navigate(`/session/${sessionId}`);
  }, [navigate]);

  // Load sessions with retry logic
  const loadSessions = useCallback(async (retryCount = 3) => {
    if (!userLoaded || !user?.id) {
      console.log("[loadSessions] User not loaded or no ID.");
      return;
    }

    let lastError: Error | null = null;
    for (let i = 0; i < retryCount; i++) {
      try {
        console.log("[loadSessions] Attempt", i + 1, "of", retryCount);
        const storedSessions = await sessionStore.getUserSessions(user.id);
        const formattedSessions = storedSessions.map(formatSession);
        setSessions(formattedSessions);
        return;
      } catch (err) {
        lastError = err as Error;
        console.error("[loadSessions] Attempt", i + 1, "failed:", err);
        if (i < retryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw createSessionError(lastError, 'Failed to load sessions');
  }, [user?.id, userLoaded]);

  // Initialize the context
  useEffect(() => {
    const initialize = async () => {
      if (initializationLock.current) return;
      initializationLock.current = true;

      try {
        if (!userLoaded || !user?.id) {
          throw new SessionError(
            'User not loaded',
            'USER_NOT_LOADED',
            true
          );
        }

        await loadSessions();
        setIsInitialized(true);
      } catch (error) {
        setError(createSessionError(error));
      } finally {
        initializationLock.current = false;
      }
    };

    initialize();
  }, [userLoaded, user?.id, loadSessions]);

  // Create session with proper locking and retries
  const createSession = useCallback(async (): Promise<string | null> => {
    if (sessionCreationLock.current) {
      console.warn('Session creation already in progress');
      return null;
    }

    if (!userLoaded || !user?.id) {
      throw new SessionError('User not loaded', 'USER_NOT_LOADED', true);
    }

    sessionCreationLock.current = true;
    setLoading(true);
    setError(null);

    try {
      const newSession = await sessionStore.addSession();
      const formattedSession = formatSession(newSession);
      
      // Use functional updates to ensure state consistency
      setSessions(prev => [formattedSession, ...prev]);
      setCurrentSessionId(newSession.id);
      
      // Only navigate after state is updated
      await new Promise(resolve => setTimeout(resolve, 0));
      navigateToSession(newSession.id);
      
      return newSession.id;
    } catch (err) {
      const sessionError = new SessionError(
        'Failed to create session',
        'SESSION_CREATE_FAILED',
        true
      );
      setError(sessionError);
      throw sessionError;
    } finally {
      sessionCreationLock.current = false;
      setLoading(false);
    }
  }, [user?.id, userLoaded, navigateToSession]);

  // Delete session with locking
  const deleteSession = useCallback(async (sessionId: string) => {
    if (sessionDeletionLock.current) {
      console.warn('Session deletion already in progress');
      return;
    }

    sessionDeletionLock.current = true;
    setLoading(true);
    setError(null);

    try {
      await sessionStore.deleteSession(sessionId);
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
      await loadSessions();
    } catch (err) {
      const sessionError = createSessionError(err, 'Failed to delete session');
      setError(sessionError);
      throw sessionError;
    } finally {
      sessionDeletionLock.current = false;
      setLoading(false);
    }
  }, [currentSessionId, loadSessions]);

  // Update session with proper error handling
  const updateSession = useCallback(async (sessionId: string, updates: Partial<StoredSession>) => {
    setLoading(true);
    setError(null);
    try {
      const updatesWithTimestamp = {
        ...updates,
        timestamp: updates.timestamp || new Date().toISOString()
      };

      await sessionStore.updateSession(sessionId, updatesWithTimestamp);

      setSessions(prev => prev.map(session => {
        if (session.id !== sessionId) return session;

        const storedSession = sessionStore.getSessions().find(s => s.id === sessionId);
        if (!storedSession) return session;

        const updatedSession: StoredSession = {
          ...storedSession,
          ...updatesWithTimestamp,
        };

        return formatSession(updatedSession);
      }));
    } catch (err) {
      const sessionError = createSessionError(err, 'Failed to update session');
      setError(sessionError);
      throw sessionError;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get URL session ID using useParams (primary) and pathname (fallback)
  const { sessionId: urlSessionId } = useParams();

  // Determine the session ID to use
  const sessionIdToUse = useMemo(() => {
    if (currentSessionId && location.pathname.startsWith('/session/')) {
      console.log("[SessionContext] Using currentSessionId:", currentSessionId);
      return currentSessionId;
    }

    if (urlSessionId) {
      console.log("[SessionContext] Using urlSessionId:", urlSessionId);
      return urlSessionId;
    }

    const match = location.pathname.match(/^\/session\/([a-zA-Z0-9-]+)$/);
    if (match && match[1]) {
      console.log("[SessionContext] Using sessionId from pathname:", match[1]);
      return match[1];
    }

    console.log("[SessionContext] No valid sessionId found.");
    return null;
  }, [currentSessionId, urlSessionId, location.pathname]);

  // Handle URL and session synchronization
  useEffect(() => {
    if (!userLoaded || !user?.id) {
      console.log("[SessionContext] Routing useEffect: Waiting for user...");
      return;
    }

    const handleUrlSession = async () => {
      try {
        console.log("[SessionContext] handleUrlSession - sessionIdToUse:", sessionIdToUse);

        // 1. If on the root path AND no sessions: Create
        if (location.pathname === '/' && sessions.length === 0) {
          console.log("[SessionContext] Root path, no sessions. Creating.");
          await createSession();
          return;
        }

        // 2. If we have a valid sessionIdToUse, try to select/load it
        if (sessionIdToUse) {
          console.log("[SessionContext] Valid sessionIdToUse:", sessionIdToUse);

          // Check if the session is already in the loaded sessions
          let session = sessions.find(s => s.id === sessionIdToUse);

          if (!session) {
            console.log("[SessionContext] Session not in loaded sessions, fetching from store.");
            const storedSessions = await sessionStore.getUserSessions(user.id);
            const foundSession = storedSessions.find(s => s.id === sessionIdToUse);

            if (foundSession) {
              // Update the sessions state if we found it in the store
              const formattedSessions = storedSessions.map(s => ({
                id: s.id,
                title: s.title || 'New Chat',
                timestamp: s.timestamp || new Date().toISOString()
              }));
              setSessions(formattedSessions);
              session = formattedSessions.find(s => s.id === sessionIdToUse);
            }
          }

          if (session) {
            setCurrentSessionId(sessionIdToUse);
            if (location.pathname !== `/session/${sessionIdToUse}`) {
              console.log('[session] navigating to session');
              navigateToSession(sessionIdToUse);
            }
          } else {
            // Invalid session ID: navigate to first session or create
            console.log("[SessionContext] Session not found. Navigating to first or creating.");
            const storedSessions = await sessionStore.getUserSessions(user.id);
            if (storedSessions.length > 0) {
              navigateToSession(storedSessions[0].id);
            } else {
              await createSession();
            }
          }
          return;
        }

        // 3. No valid sessionId, on /session path, no currentSessionId: Use existing or create
        if (!sessionIdToUse && location.pathname.startsWith('/session') && !currentSessionId) {
          console.log("[SessionContext] No sessionIdToUse, on /session, no current ID. Using existing or creating.");
          const storedSessions = await sessionStore.getUserSessions(user.id);
          if (storedSessions.length > 0) {
            navigateToSession(storedSessions[0].id);
          } else {
            await createSession();
          }
        }
      } catch (error) {
        setError(createSessionError(error, 'Failed to handle URL session'));
      }
    };

    handleUrlSession();
  }, [userLoaded, user?.id, sessionIdToUse, currentSessionId, navigateToSession, createSession, location.pathname, sessions.length]);

  // Select a session (only sets ID)
  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  // Memoize for performance
  const memoizedSessions = useMemo(() => {
    return sessions.map((s) => ({
      id: s.id,
      title: s.title || 'New Chat',
      timestamp: s.timestamp || new Date().toISOString(),
      isActive: s.id === currentSessionId,
    }));
  }, [sessions, currentSessionId]);

  const memoizedHandlers = useMemo(() => ({
    createSession,
    selectSession,
    deleteSession,
    updateSession,
  }), [createSession, selectSession, deleteSession, updateSession]);

  // Effect to handle navigation - separate from session loading
  useEffect(() => {
    if (currentSessionId) {
      const basePath = "/session";
      // Only redirect if we're already in a session-related route
      if (location.pathname.startsWith(basePath) && location.pathname !== `${basePath}/${currentSessionId}`) {
        console.log('[sessioncontext] ROUTING NAVIGATE');
        navigate(`${basePath}/${currentSessionId}`);
      }
    }
  }, [currentSessionId, navigate, location.pathname]);

  const contextValue: SessionContextState = useMemo(() => ({
    sessions: memoizedSessions,
    currentSessionId,
    loading,
    error,
    isInitialized,
    isVoiceMode,
    setVoiceMode: setIsVoiceMode,
    ...memoizedHandlers,
  }), [memoizedSessions, currentSessionId, loading, error, isInitialized, isVoiceMode, memoizedHandlers]);

  if (!isInitialized && !error) {
    return null; // or a loading spinner
  }

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

// Helper function to format a session
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