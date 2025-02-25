// src/db/SessionContext.tsx
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
import { useNavigate, useParams, useLocation } from 'react-router-dom';

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
  const location = useLocation();

  // Stable navigation function
  const navigateToSession = useCallback((sessionId: string) => {
    navigate(`/session/${sessionId}`);
  }, [navigate]);

    // Create session (ensure user is loaded)
    const createSession = useCallback(async (): Promise<string | null> => {
        if (!userLoaded || !user?.id) {
            console.error('[SessionContext] createSession: User not loaded or no ID.');
            return null;
        }

        setLoading(true);
        setError(null);
        try {
            const newSession = await sessionStore.addSession();
            const formattedSession = formatSession(newSession);
            setSessions((prevSessions) => [formattedSession, ...prevSessions]);
            setCurrentSessionId(newSession.id);
            navigateToSession(newSession.id); // Navigate *after* setting state
            return newSession.id;
        } catch (err: any) {
            console.error('[SessionContext] Failed to create session:', err);
            setError(err.message || 'Failed to create session');
            return null;
        } finally {
            setLoading(false);
        }
    }, [user?.id, userLoaded, navigateToSession]);

  // Load sessions (no navigation)
  const loadSessions = useCallback(async () => {
    if (!userLoaded || !user?.id) {
      console.log("[loadSessions] User not loaded or no ID.");
      return;
    }

    console.log("[loadSessions] Loading sessions...");
    setLoading(true);
    setError(null);
    try {
      const storedSessions = await sessionStore.getUserSessions(user.id);
      const formattedSessions = storedSessions.map(formatSession);
      setSessions(formattedSessions);
      console.log("[loadSessions] Loaded sessions:", formattedSessions);
    } catch (err: any) {
      console.error("[loadSessions] Error loading sessions:", err);
      setError(err.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [user?.id, userLoaded]);

  // Get URL session ID using useParams (primary) and pathname (fallback)
  const { sessionId: urlSessionId } = useParams();

    // Determine the session ID to use, prioritizing currentSessionId, then urlSessionId, then parsing from pathname
    const sessionIdToUse = useMemo(() => {
        if (currentSessionId && location.pathname.startsWith('/session/')) {
            // If we have a currentSessionId and are on a /session/* path, prioritize that
            console.log("[SessionContext] Using currentSessionId:", currentSessionId);
            return currentSessionId;
        }

        if (urlSessionId) {
            console.log("[SessionContext] Using urlSessionId:", urlSessionId);
            return urlSessionId; // Use useParams if available
        }

        // Fallback: Parse from pathname (more robust)
        const match = location.pathname.match(/^\/session\/([a-zA-Z0-9-]+)$/);
        if (match && match[1]) {
            console.log("[SessionContext] Using sessionId from pathname:", match[1]);
            return match[1]; // Extract ID from /session/<id>
        }

        console.log("[SessionContext] No valid sessionId found.");
        return null; // No valid session ID
    }, [currentSessionId, urlSessionId, location.pathname]);


  // Handle URL and session synchronization (Refactored)
    useEffect(() => {
        if (!userLoaded || !user?.id) {
            console.log("[SessionContext] Routing useEffect: Waiting for user...");
            return;
        }

        const handleUrlSession = async () => {
            console.log("[SessionContext] handleUrlSession - sessionIdToUse:", sessionIdToUse, "currentSessionId:", currentSessionId, "location:", location.pathname, "sessions.length:", sessions.length);


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
                    // If not, try to load it from the store
                    const storedSessions = await sessionStore.getUserSessions(user.id);
                    session = storedSessions.find(s => s.id === sessionIdToUse);

                    if (session) {
                        // Update the sessions state if we found it in the store
                        const formattedSessions = storedSessions.map(formatSession);
                        setSessions(formattedSessions);
                    }
                }
                if (session) {
                    setCurrentSessionId(sessionIdToUse);
                    if (location.pathname !== `/session/${sessionIdToUse}`) {
                        // If we're not already on the correct path, navigate
                        console.log('[session] navigating ot session')
                        navigateToSession(sessionIdToUse);
                    }
                }
                 else {
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
        };

        handleUrlSession();
// Include sessions.length as a dependency to handle edge cases with session creation/deletion
    }, [userLoaded, user?.id, sessionIdToUse, currentSessionId, navigateToSession, createSession, location.pathname, sessions.length]);



  // Load sessions on mount and user changes
  useEffect(() => {
    if (userLoaded && user?.id) {
      loadSessions();
    }
  }, [loadSessions, userLoaded, user?.id]);

  // Select a session (only sets ID)
  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  // Delete a session
    const deleteSession = useCallback(async (sessionId: string) => {
        setLoading(true);
        setError(null);
        try {
            await sessionStore.deleteSession(sessionId);
            if (currentSessionId === sessionId) {
                setCurrentSessionId(null);
            }
            await loadSessions(); // Reload sessions
        } catch (err) {
            setError(err.message || "Failed to delete");
        } finally {
            setLoading(false);
        }
    }, [currentSessionId, loadSessions]);

  // Update a session
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
    } catch (err: any) {
      setError(err.message || 'Failed to update session');
    } finally {
      setLoading(false);
    }
  }, []);

// Memoize for performance
const memoizedSessions = useMemo(() => {
    return sessions.map((s) => ({
        ...s,
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
        // Only navigate if not already on correct path.
        if (location.pathname !== `${basePath}/${currentSessionId}`) {
          console.log('[sessioncontext] ROUTING NAVIGATE')
            navigate(`${basePath}/${currentSessionId}`);
        }
    }
}, [currentSessionId, navigate, location.pathname]);

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

// ... (useSessionContext and formatSession remain the same) ...
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