import { create } from 'zustand';
import { AssistantTranscriptMessage, ChatMetadataMessage, ConnectionMessage, JSONMessage, UserTranscriptMessage } from '@/lib/hume-lib/models/messages';
import { keepLastN } from '@/lib/hume-lib/utils';
import { CloseEvent } from 'hume/core';

interface VoiceMessages {
  // State
  messages: (JSONMessage | ConnectionMessage)[];
  lastVoiceMessage: AssistantTranscriptMessage | null;
  lastUserMessage: UserTranscriptMessage | null;
  messageHistoryLimit: number;
  voiceMessageMap: Record<string, AssistantTranscriptMessage>;
  sendMessageToParent: ((message: JSONMessage) => void) | undefined;

  // Actions
  onMessage: (message: JSONMessage) => void;
  onPlayAudio: (id: string) => void;
  createConnectMessage: () => void;
  createDisconnectMessage: (event: CloseEvent) => void;
  clearMessages: () => void;
  setMessageHistoryLimit: (limit: number) => void;
  setSendMessageToParent: (callback: ((message: JSONMessage) => void) | undefined) => void;
}

export const useVoiceMessagesStore = create<VoiceMessages>((set, get) => ({
  // State
  messages: [],
  lastVoiceMessage: null,
  lastUserMessage: null,
  messageHistoryLimit: 100,
  voiceMessageMap: {},
  sendMessageToParent: undefined,

  // Actions
  clearMessages: () => set({ 
    messages: [], 
    lastVoiceMessage: null, 
    lastUserMessage: null,
    voiceMessageMap: {}
  }),
  setMessageHistoryLimit: (limit: number) => set({ messageHistoryLimit: limit }),

  setSendMessageToParent: (callback) => set({ sendMessageToParent: callback }),

  createConnectMessage: () => set((state) => ({
    messages: keepLastN(state.messageHistoryLimit, [...state.messages, {
      type: 'socket_connected',
      receivedAt: new Date(),
    }])
  })),

  createDisconnectMessage: (event: CloseEvent) => set((state) => ({
    messages: keepLastN(state.messageHistoryLimit, [...state.messages, {
      type: 'socket_disconnected',
      code: event.code,
      reason: event.reason,
      receivedAt: new Date(),
    }])
  })),

  onMessage: (message: JSONMessage) => {
    const state = get();
    const { sendMessageToParent, messageHistoryLimit } = state;

    switch (message.type) {
      case 'assistant_message':
        // Store in voiceMessageMap, will be added to messages when audio plays
        if ('id' in message) {
          set((state) => ({
            voiceMessageMap: { ...state.voiceMessageMap, [message.id as string]: message }
          }));
        }
        break;

      case 'user_message':
        sendMessageToParent?.(message);
        if (message.interim === false) {
          set((state) => ({
            lastUserMessage: message,
            messages: keepLastN(messageHistoryLimit, [...state.messages, message])
          }));
        }
        break;

      case 'user_interruption':
      case 'error':
      case 'tool_call':
      case 'tool_response':
      case 'tool_error':
      case 'assistant_end':
        sendMessageToParent?.(message);
        set((state) => ({
          messages: keepLastN(messageHistoryLimit, [...state.messages, message])
        }));
        break;

      case 'chat_metadata':
        sendMessageToParent?.(message);
        set((state) => ({
          messages: keepLastN(messageHistoryLimit, [...state.messages, message])
        }));
        break;
    }
  },

  onPlayAudio: (id: string) => {
    const state = get();
    const matchingTranscript = state.voiceMessageMap[id];
    
    if (matchingTranscript) {
      state.sendMessageToParent?.(matchingTranscript);
      set((state) => {
        // Remove from map to prevent duplicates
        const newMap = { ...state.voiceMessageMap };
        delete newMap[id];

        return {
          lastVoiceMessage: matchingTranscript,
          messages: keepLastN(state.messageHistoryLimit, [...state.messages, matchingTranscript]),
          voiceMessageMap: newMap
        };
      });
    }
  }
}));

