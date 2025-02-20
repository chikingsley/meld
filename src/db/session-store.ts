// src/lib/session-store.ts
import { useVoice } from "@/lib/VoiceProvider";

export interface StoredMessage {
  message: {
    role: string;
    content: string;
  };
  expressions?: Record<string, number>;
  labels?: Record<string, number>;
  prosody?: Record<string, number>;
  timestamp: string;
}

export interface StoredSession {
  id: string;
  userId: string;
  timestamp: string;
  title?: string;
  lastMessage?: string;
  messages: StoredMessage[];
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
      messages: [],
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
  },

  addMessage(sessionId: string, message: StoredMessage) {
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index !== -1) {
      if (!sessions[index].messages) {
        sessions[index].messages = [];
      }
      sessions[index].messages.push(message);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      console.log('Updated session messages');
    } else {
      console.error('Session not found:', sessionId);
    }
  },

  getMessages(sessionId: string): StoredMessage[] {
    const sessions = this.getSessions();
    const session = sessions.find(s => s.id === sessionId);
    const messages = session?.messages || [];
    return messages;
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
