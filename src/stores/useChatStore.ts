// src/stores/useChatStore.ts
import { create } from 'zustand';
import type { Message } from '@/types/messages';
import { sessionStore } from '@/db/session-store';
import { prismaStore } from '@/db/prisma-store';

interface ChatState {
  // Core message state
  messages: Message[];
  storedMessages: Message[];
  apiMessages: Message[];
  allSessions: any[]; // We should type this properly
  allMessages: Message[];
  
  // Loading states
  apiLoading: boolean;
  isTransitioning: boolean;
  
  // Actions
  fetchApiMessages: (sessionId: string) => Promise<void>;
  addMessage: (sessionId: string, message: Message) => Promise<void>;
  loadUserSessions: (userId: string) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  storedMessages: [],
  apiMessages: [],
  allSessions: [],
  allMessages: [],
  apiLoading: false,
  isTransitioning: false,

  fetchApiMessages: async (sessionId) => {
    if (!sessionId) return;
    
    set({ apiLoading: true });
    try {
      const messages = await prismaStore.getMessages(sessionId);
      set({ apiMessages: messages });
    } catch (error) {
      console.error('Error fetching API messages:', error);
    } finally {
      set({ apiLoading: false });
    }
  },

  addMessage: async (sessionId, message) => {
    await sessionStore.addMessage(sessionId, message);
    const messages = sessionStore.getMessages(sessionId);
    set({ storedMessages: messages });
  },

  loadUserSessions: (userId) => {
    const sessions = sessionStore.getUserSessions(userId);
    const allMessages = sessions.flatMap(session => 
      (session.messages || []).map(message => ({
        ...message,
        sessionId: session.id,
        sessionTitle: session.title || 'Untitled Session'
      }))
    ).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    set({ 
      allSessions: sessions,
      allMessages
    });
  },

  setMessages: (messages) => set({ messages }),
  clearMessages: () => set({ messages: [] })
}));