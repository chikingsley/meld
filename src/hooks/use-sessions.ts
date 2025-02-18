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
  const { messages, status } = useVoice();
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

  // Create session only when voice connection is established
  const createSession = () => {
    if (!user?.id) return null;
    
    console.log('[useSessions] Creating new session');
    const newSession = sessionStore.addSession(user.id);
    const formattedSession = formatSession(newSession);
    setSessions(prev => [formattedSession, ...prev]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  };

  const selectSession = (sessionId: string) => {
    console.log(`[useSessions] Selecting session: ${sessionId}`);
    setActiveSessionId(sessionId);
  };

  const deleteSession = (sessionId: string) => {
    console.log(`[useSessions] Deleting session: ${sessionId}`);
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
    console.log(`[useSessions] Updating session: ${sessionId}`, updates);
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
  // Find first user message
  const firstUserMessage = messages.find(
    msg => 'message' in msg && msg.message.role === 'user'
  );
  if (firstUserMessage && 'message' in firstUserMessage) {
    const content = firstUserMessage.message.content;
    return content.length > 50 ? content.substring(0, 47) + '...' : content;
  }
  return 'New Chat';
}
