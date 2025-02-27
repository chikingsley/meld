// src/stores/useChatStore.ts
import { create } from 'zustand';
import type { Message } from '@/types/messages';
import { sessionStore } from '@/db/session-store';
import { prismaStore } from '@/db/prisma-store';

interface ChatState {
  // Core message state
  currentMessages: Message[];
  storedMessages: Message[];
  apiMessages: Message[];
  allSessions: any[]; // We'll type this properly later
  allMessages: Message[];
  
  // Loading states
  isLoading: boolean;
  
  // Actions
  setCurrentMessages: (messages: Message[]) => void;
  fetchApiMessages: (sessionId: string) => Promise<void>;
  addMessage: (sessionId: string, message: Message) => Promise<void>;
  loadUserSessions: (userId: string) => Promise<void>;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  currentMessages: [],
  storedMessages: [],
  apiMessages: [],
  allSessions: [],
  allMessages: [],
  isLoading: false,

  // Actions
  setCurrentMessages: (messages) => {
    set({ currentMessages: messages });
  },

  fetchApiMessages: async (sessionId) => {
    if (!sessionId) return;
    
    set({ isLoading: true });
    try {
      const messages = await prismaStore.getMessages(sessionId);
      set({ apiMessages: messages });
    } catch (error) {
      console.error('Error fetching API messages:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addMessage: async (sessionId, message) => {
    try {
      await sessionStore.addMessage(sessionId, message);
      const messages = sessionStore.getMessages(sessionId);
      set({ storedMessages: messages });
    } catch (error) {
      console.error('Error adding message:', error);
    }
  },

  loadUserSessions: async (userId) => {
    try {
      set({ isLoading: true });
      const sessions = await sessionStore.getUserSessions(userId);
      
      // Get all messages from all sessions
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
        allMessages,
        isLoading: false
      });
    } catch (error) {
      console.error('Error loading user sessions:', error);
      set({ isLoading: false });
    }
  },

  clearMessages: () => set({ 
    currentMessages: [],
    storedMessages: [],
    apiMessages: [] 
  })
}));