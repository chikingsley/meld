// src/providers/TextProvider.tsx
import { useCallback, useState, useRef } from 'react';
import { useSessionStore } from '@/stores/useSessionStore';
import { useSessionContext } from "@/providers/SessionProvider"
import type {
  AssistantTranscriptMessage,
  JSONMessage,
  UserTranscriptMessage,
} from '@/types/hume-messages';
import { keepLastN } from '@/lib/hume/keepLastN';
import { useCompletions } from '@/hooks/useCompletions';

interface TextMessagesOptions {
  messageHistoryLimit: number;
  onMessage?: (message: JSONMessage) => void;
}

async function getEmotions(text: string) {
  try {
    const response = await fetch('/api/chat/emotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error analyzing emotions:', error);
    return {};
  }
}

export function useText({
  messageHistoryLimit = 100,
  onMessage,
}: TextMessagesOptions) {
  const { messages, setMessages } = useSessionStore();
  
  const [lastAssistantMessage, setLastAssistantMessage] = 
    useState<AssistantTranscriptMessage | null>(null);
  const [lastUserMessage, setLastUserMessage] = 
    useState<UserTranscriptMessage | null>(null);
  
  const { currentSessionId, createSession } = useSessionContext();
  // Add a ref to track if we've created a session for this text conversation
  const hasCreatedSessionRef = useRef(false);
  
  const { sendMessage: sendCompletion, isStreaming } = useCompletions({
    sessionId: currentSessionId!,
    onMessage: (message) => {
      onMessage?.(message);
      setMessages(prev => keepLastN(messageHistoryLimit, prev.concat([message])));
      if (message.type === 'assistant_message') {
        setLastAssistantMessage(message);
      }
    }
  });

  const sendMessage = useCallback(async (content: string) => {
    try {
      if (!content) return;

      // Create a session if this is the first message and no session exists yet
      let sessionId = currentSessionId;
      if (!sessionId && !hasCreatedSessionRef.current) {
        console.log("[TextProvider] Creating new session for first text message");
        sessionId = await createSession();
        hasCreatedSessionRef.current = true;
      }
      
      // If we still don't have a session ID, we can't proceed
      if (!sessionId) {
        console.error("[TextProvider] Failed to create or retrieve session ID");
        return;
      }

      // Add user message
      const now = new Date();
      
      // Get emotions for user message
      const emotionScores = await getEmotions(content);
      
      const userMessage: UserTranscriptMessage = {
        type: 'user_message',
        interim: false,
        fromText: true,
        time: {
          begin: now.getTime(),
          end: now.getTime()
        },
        message: {
          role: 'user',
          content: content
        },
        receivedAt: now,
        models: {
          prosody: { scores: emotionScores }
        }
      };

      // Add user message and update state
      onMessage?.(userMessage);
      setLastUserMessage(userMessage);
      
      // Get message history before adding new message
      const messageHistory = messages
        .filter((msg): msg is AssistantTranscriptMessage | UserTranscriptMessage => 
          msg.type === 'assistant_message' || msg.type === 'user_message')
        .map(msg => ({
          role: msg.message.role,
          content: msg.message.content || ''
        }));

      // Update messages state with new user message
      const updatedMessages = keepLastN(messageHistoryLimit, messages.concat([userMessage]));
      setMessages(updatedMessages);

      // Send completion with history (current message added by useCompletions)
      await sendCompletion(content, messageHistory);
    } catch (error) {
      console.error('Error in text messages:', error);
      throw error;
    }
  }, [messageHistoryLimit, sendCompletion, setMessages, onMessage, currentSessionId, createSession]);

  // Reset the session creation flag when we switch to a new session
  // or when we clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastUserMessage(null);
    setLastAssistantMessage(null);
    hasCreatedSessionRef.current = false;
  }, [setMessages]);
  
  // Reset the session creation flag when currentSessionId changes
  // This ensures we don't try to create a new session if we switch to an existing one
  const previousSessionIdRef = useRef<string | null>(null);
  if (currentSessionId !== previousSessionIdRef.current) {
    previousSessionIdRef.current = currentSessionId;
    hasCreatedSessionRef.current = !!currentSessionId; // If we have a session ID, consider it created
  }

  return {
    sendMessage,
    lastUserMessage,
    lastAssistantMessage,
    isStreaming,
    clearMessages
  };
}