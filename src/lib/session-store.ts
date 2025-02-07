import { useVoice } from "@humeai/voice-react";

export interface StoredSession {
  id: string;
  userId: string;
  timestamp: string;
  title?: string;
  lastMessage?: string;
}

const SESSIONS_KEY = 'meld_sessions';

export const sessionStore = {
  getSessions(): StoredSession[] {
    const stored = localStorage.getItem(SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  addSession(userId: string): StoredSession {
    const sessions = this.getSessions();
    const newSession: StoredSession = {
      id: crypto.randomUUID(),
      userId,
      timestamp: new Date().toISOString(),
    };
    
    sessions.unshift(newSession);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    return newSession;
  },

  updateSession(sessionId: string, updates: Partial<StoredSession>) {
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    
    if (index !== -1) {
      sessions[index] = { ...sessions[index], ...updates };
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }
  },

  deleteSession(sessionId: string) {
    const sessions = this.getSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
  },

  getUserSessions(userId: string): StoredSession[] {
    return this.getSessions().filter(s => s.userId === userId);
  }
};

// React hook for session management
export function useSession() {
  const { messages } = useVoice();
  
  const createSession = (userId: string) => {
    return sessionStore.addSession(userId);
  };

  const updateCurrentSession = (sessionId: string) => {
    // Get last message for title/preview
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && ('message' in lastMessage)) {
      sessionStore.updateSession(sessionId, {
        lastMessage: lastMessage.message.content
      });
    }
  };

  return {
    createSession,
    updateCurrentSession,
    getUserSessions: sessionStore.getUserSessions,
    deleteSession: sessionStore.deleteSession
  };
}
