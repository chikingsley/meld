import { create } from 'zustand';
import type { JSONMessage, AssistantTranscriptMessage, UserTranscriptMessage } from '@/models/messages';
import { keepLastN } from '@/lib/utils';

interface MessageState {
  messages: JSONMessage[];
  setMessages: (message: JSONMessage) => void;
  getMessageHistory: (limit?: number) => { role: string; content: string }[];
  clearMessages: () => void;
  getLastMessage: () => AssistantTranscriptMessage | UserTranscriptMessage | null;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: [],

  setMessages: (message) => set((state) => ({
    messages: keepLastN(100, [...state.messages, message])
  })),

  getMessageHistory: (limit = 100) => {
    const messages = get().messages;
    return keepLastN(limit, messages)
      .filter((msg): msg is AssistantTranscriptMessage | UserTranscriptMessage => 
        msg.type === 'assistant_message' || msg.type === 'user_message'
      )
      // Filter out messages with no content
      .filter(msg => typeof msg.message.content === 'string')
      .map(msg => ({
        role: msg.message.role as string,
        content: msg.message.content || ''
      }));
  },

  clearMessages: () => set({ messages: [] }),

  getLastMessage: () => {
    const messages = get().messages;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg && (lastMsg.type === 'assistant_message' || lastMsg.type === 'user_message')) {
      return lastMsg;
    }
    return null;
  }
}));
