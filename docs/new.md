Here's the analysis and refactoring plan to reduce re-renders:

Create Separate Stores
typescript
CopyInsert
// src/lib/stores/voiceStateStore.ts
export const useVoiceStateStore = create<VoiceState>((set) => ({
  status: { value: 'disconnected' },
  error: null,
  isPaused: false,
  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setIsPaused: (isPaused) => set({ isPaused })
}));

// src/lib/stores/voiceMessagesStore.ts
export const useVoiceMessagesStore = create<VoiceMessages>((set) => ({
  messages: [],
  lastVoiceMessage: null,
  lastUserMessage: null,
  clearMessages: () => set({ messages: [], lastVoiceMessage: null, lastUserMessage: null }),
  addMessage: (message) => set(state => ({
    messages: [...state.messages, message],
    // Update last messages based on type...
  }))
}));

// src/lib/stores/voiceActionsStore.ts
export const useVoiceActionsStore = create<VoiceActions>((set) => ({
  connect: async () => { /* ... */ },
  disconnect: async () => { /* ... */ },
  sendSessionSettings: (settings) => { /* ... */ }
}));
Update Component Usage
a. session-store.ts:

typescript
CopyInsert
// Before
const { messages } = useVoice();
// After
const messages = useVoiceMessagesStore(state => state.messages);
b. voice-cleanup.tsx:

typescript
CopyInsert
// Before
const { status, disconnect, clearMessages } = useVoice();
// After
const status = useVoiceStateStore(state => state.status);
const disconnect = useVoiceActionsStore(state => state.disconnect);
const clearMessages = useVoiceMessagesStore(state => state.clearMessages);
c. Chat.tsx:

typescript
CopyInsert
// Before
const { messages, clearMessages, status } = useVoice();
// After
const messages = useVoiceMessagesStore(state => state.messages);
const clearMessages = useVoiceMessagesStore(state => state.clearMessages);
const status = useVoiceStateStore(state => state.status);
d. BottomControls.tsx:

typescript
CopyInsert
// Before
const { status } = useVoiceState();
const { connect, disconnect, sendSessionSettings } = useVoiceActions();
// After
const status = useVoiceStateStore(state => state.status);
const { connect, disconnect, sendSessionSettings } = useVoiceActionsStore(
  state => ({ 
    connect: state.connect,
    disconnect: state.disconnect,
    sendSessionSettings: state.sendSessionSettings 
  })
);