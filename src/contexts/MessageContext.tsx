// src/contexts/MessageContext.tsx
import React, {
    createContext,
    useContext,
    useReducer,
    ReactNode,
    useCallback,
    useMemo,
  } from 'react';
  import { StoredMessage } from '@/lib/session-store';
  import { useVoiceContext } from './VoiceContext'; // Import useVoiceContext
  import {
    UserMessage,
    AssistantMessage,
  } from '@/lib/hume-lib/VoiceProvider';
  
  // Define a union type for all possible message types that we will process.  This helps
  // with type safety.
  type VoiceMessage =
    | UserMessage
    | AssistantMessage
  
  
  interface MessageContextState {
    storedMessages: StoredMessage[];
    processedMessages: VoiceMessage[]; // Use the union type
  }
  
  interface MessageContextActions {
    setStoredMessages: (messages: StoredMessage[]) => void;
    // Add other actions as needed (add, clear, save)
  }
  
  type MessageContextType = MessageContextState & MessageContextActions;
  
  // Create the context with NO-OP and empty defaults
  const MessageContext = createContext<MessageContextType>({
    storedMessages: [],
    processedMessages: [],
    setStoredMessages: () => {}, // No-op function
  });
  
  // Reducer for message state
  const messageReducer = (
    state: MessageContextState,
    action: { type: string; payload?: any },
  ): MessageContextState => {
    switch (action.type) {
      case 'SET_STORED_MESSAGES':
        return { ...state, storedMessages: action.payload };
      // Add other cases as needed
      default:
        return state;
    }
  };
  
  export const MessageProvider: React.FC<{ children: ReactNode }> = ({
    children,
  }) => {
    const [state, dispatch] = useReducer(messageReducer, {
      storedMessages: [],
      processedMessages: [],
    });
    const { messages } = useVoiceContext(); // Get live messages from VoiceContext
  
    // Actions to modify the state, wrapped in useCallback for memoization.
    const setStoredMessages = useCallback(
      (messages: StoredMessage[]) => {
        dispatch({ type: 'SET_STORED_MESSAGES', payload: messages });
      },
      [],
    ); // Empty dependency array because this function doesn't depend on anything
  
    // Memoize processed messages.  This is where the message processing logic lives.
    const processedMessages = useMemo(() => {
      const createMessageId = (msg: { message?: { content?: string, role?: string }, type?: string }) => {
        const content = msg.message?.content || '';
        const role = msg.message?.role || msg.type || 'unknown'; // Fallback to 'unknown'
        return `${role}-${content}`;
      };
  
      const convertedStoredMessages = state.storedMessages.map((msg) => {
          //Added defensive coding incase message does not exist
          if (!msg.message){
              return null; // Or some other default/fallback object that matches VoiceMessage
          }
          return {
          id: createMessageId(msg),
          type: msg.message.role === 'user' ? 'user_message' : 'assistant_message',
          message: msg.message,
          models: {
            prosody: { scores: msg.prosody },
            expressions: { scores: msg.expressions },
            labels: { scores: msg.labels },
          },
          timestamp: msg.timestamp,
        }});
  
      const messagesWithIds = messages.map((msg) => ({
        ...msg,
        id: createMessageId(msg),
        timestamp: new Date().toISOString(),
      }));
  
      // Deduplicate messages, preferring live messages.
      const messageMap = new Map();
      [...convertedStoredMessages, ...messagesWithIds].forEach((msg) => {
        if (msg && msg.id) { // Check for null before accessing id
          messageMap.set(msg.id, msg);
        }
      });
  
      return Array.from(messageMap.values()) as VoiceMessage[]; // Cast to the union type
    }, [state.storedMessages, messages]);
  
    const value = useMemo(() => ({
      storedMessages: state.storedMessages,
      processedMessages,
      setStoredMessages,
  
    }), [state.storedMessages, processedMessages, setStoredMessages])
  
    return (
      <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
    );
  };
  
  // Custom hook to use the context
  export const useMessageContext = () => {
    const context = useContext(MessageContext);
    if (!context) {
      throw new Error(
        'useMessageContext must be used within a MessageProvider',
      );
    }
    return context;
  };