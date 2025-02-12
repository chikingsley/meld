// src/hooks/use-sessions.ts
import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { sessionStore, StoredSession } from '@/lib/session-store';
import { useVoice } from '@/lib/hume-lib/VoiceProvider';
import { formatDistanceToNow } from 'date-fns';

export interface ChatSession {
  id: string;
  title: string;
  timestamp: string;
  isActive?: boolean;
}

export function useSessions() {
  const { user } = useUser();
  const { messages } = useVoice();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Load sessions on mount
  useEffect(() => {
    if (user?.id) {
      const storedSessions = sessionStore.getUserSessions(user.id);
      setSessions(storedSessions.map(formatSession));
    }
  }, [user?.id]);

  // Update current session when messages change
  useEffect(() => {
    if (activeSessionId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if ('message' in lastMessage) {
        sessionStore.updateSession(activeSessionId, {
          lastMessage: lastMessage.message.content,
          title: getSessionTitle(messages)
        });
        // Refresh sessions list
        if (user?.id) {
          const storedSessions = sessionStore.getUserSessions(user.id);
          setSessions(storedSessions.map(formatSession));
        }
      }
    }
  }, [messages, activeSessionId, user?.id]);

  const createSession = () => {
    if (!user?.id) return null;
    const newSession = sessionStore.addSession(user.id);
    const formattedSession = formatSession(newSession);
    setSessions(prev => [formattedSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  };

  const selectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const deleteSession = (sessionId: string) => {
    sessionStore.deleteSession(sessionId);
    if (user?.id) {
      const storedSessions = sessionStore.getUserSessions(user.id);
      setSessions(storedSessions.map(formatSession));
    }
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
    }
  };

  const updateSession = (sessionId: string, updates: Partial<StoredSession>) => {
    sessionStore.updateSession(sessionId, updates);
    // Refresh sessions list
    if (user?.id) {
      const storedSessions = sessionStore.getUserSessions(user.id);
      setSessions(storedSessions.map(formatSession));
    }
  };

  return {
    sessions: sessions.map(s => ({
      ...s,
      isActive: s.id === activeSessionId
    })),
    activeSessionId,
    createSession,
    selectSession,
    deleteSession,
    updateSession
  };
}

// Helper functions
function formatSession(session: StoredSession): ChatSession {
  return {
    id: session.id,
    title: session.title || 'New Chat',
    timestamp: formatDistanceToNow(new Date(session.timestamp), { addSuffix: true })
  };
}

function getSessionTitle(messages: any[]): string {
  // Get first user message or default to "New Chat"
  const firstUserMessage = messages.find(m => 
    'message' in m && m.message.role === 'user'
  );
  if (firstUserMessage && 'message' in firstUserMessage) {
    const content = firstUserMessage.message.content;
    return content.length > 30 ? content.slice(0, 27) + '...' : content;
  }
  return 'New Chat';
}
