// src/lib/session-store.ts
import { useCallback } from 'react';
import { useSessionStore } from '@/stores/useSessionStore';
import { useUserStore } from '@/stores/useUserStore';
import { Message } from '@/types/messages';

export interface StoredSession {
  id: string;
  userId: string;
  timestamp: string;
  title?: string;
  lastMessage?: string;
  messages: Message[];
}

const SESSIONS_KEY = 'meld_sessions';

import { prismaStore } from './prisma-store';

export const sessionStore = {
  getSessions(): StoredSession[] {
    const stored = localStorage.getItem(SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  async addSession(): Promise<StoredSession> {
    const sessions = this.getSessions();
    
    // Create new session
    const userId = useUserStore.getState().userId;
    if (!userId) {
      throw new Error('Cannot create session: userId not set');
    }
    const newSession = await prismaStore.addSession(userId);
    
    sessions.unshift(newSession);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    console.log('🔧 Created new session:', newSession);
    
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

  async deleteSession(sessionId: string) {
    const sessions = this.getSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(filtered));
    
    // Also delete from prisma
    try {
      await prismaStore.deleteSession(sessionId);
      console.log('🔧 Deleted session from prisma:', sessionId);
    } catch (error) {
      console.error('Failed to delete session from prisma:', error);
    }
  },

  getUserSessions(userId: string): StoredSession[] {
    return this.getSessions().filter(s => s.userId === userId);
  },

  async addMessage(sessionId: string, message: Message) {
    console.log('🔧 Adding message to session store:', { sessionId, message });
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === sessionId);
    if (index !== -1) {
      if (!sessions[index].messages) {
        sessions[index].messages = [];
      }
      sessions[index].messages.push(message);
      console.log('🔧 Updated session messages:', sessions[index].messages);
      localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
      
      // Save to prisma and store embedding in background
      console.log('🔧 Saving message to prisma...');
      try {
        const response = await prismaStore.addMessage(sessionId, message);
        const messageData = await response.json();
        console.log('🔧 Message saved to prisma:', messageData);

        // Store embedding using the message ID from the response
        if (messageData && typeof messageData === 'object' && 'id' in messageData && 'content' in messageData) {
          const messageId = messageData.id;
          const content = messageData.content;
          console.log('🔧 Storing embedding for message:', { messageId, content });
          try {
            await prismaStore.storeEmbedding(messageId, content);
            console.log('🔧 Successfully stored embedding for message:', messageId);
          } catch (err) {
            console.error('🔧 Failed to store embedding:', err);
          }
        } else {
          console.error('🔧 Invalid message data from prisma:', messageData);
        }
      } catch (error) {
        console.error('Failed to save message to prisma:', error);
      }
    } else {
      console.error('Session not found:', sessionId);
    }
  },

  getMessages(sessionId: string): Message[] {
    const sessions = this.getSessions();
    const session = sessions.find(s => s.id === sessionId);
    return session?.messages || [];
  },

  getAllMessages(userId: string): Message[] {
    const sessions = this.getUserSessions(userId);
    return sessions.flatMap(session => 
      (session.messages || []).map(message => ({
        ...message,
        sessionId: session.id
      }))
    );
  }
};


// React hook for session management
export function useSession() {
  const createSession = useCallback(async () => {
    return await sessionStore.addSession();
  }, []);

  const updateCurrentSession = useCallback(async (sessionId: string) => {
    const messages = useSessionStore.getState().messages;
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && typeof lastMessage === 'object' && 'message' in lastMessage && 
        typeof lastMessage.message === 'object' && lastMessage.message && 'content' in lastMessage.message) {
      sessionStore.updateSession(sessionId, {
        lastMessage: lastMessage.message.content
      });
    }
  }, []);

  return {
    createSession,
    updateCurrentSession,
    getUserSessions: sessionStore.getUserSessions,
    deleteSession: async (sessionId: string) => await sessionStore.deleteSession(sessionId)
  };
}
