// src/stores/useSessionStore.ts
import { create } from 'zustand';
import type { ConnectionMessage } from '@/lib/hume/connection-message';
import type { ChatMetadataMessage, JSONMessage } from '@/types/hume-messages';

export type Message = JSONMessage | ConnectionMessage;

export interface SessionState {
  messages: Message[];
  chatMetadata: ChatMetadataMessage | null;
  messageHistory: Message[];
  setMessages: (messages: Message[] | ((prev: Message[]) => Message[])) => void;
  setChatMetadata: (metadata: ChatMetadataMessage | null) => void;
  addToHistory: (message: Message) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  messages: [],
  chatMetadata: null,
  messageHistory: [],

  setMessages: (messages) => {
    set((state) => ({
      messages: typeof messages === 'function' ? messages(state.messages) : messages
    }));
  },

  addToHistory: (message: Message) => {
    set((state) => ({
      messageHistory: [...state.messageHistory, message]
    }));
  },

  setChatMetadata: (metadata) => {
    set({ chatMetadata: metadata });
  }
}));
