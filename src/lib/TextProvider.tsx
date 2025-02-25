// src/lib/TextProvider.tsx
import { useCallback, useState } from 'react';
import { useSessionStore } from '@/stores/useSessionStore';
import { useSessionContext } from "@/contexts/SessionContext"
import type {
  AssistantTranscriptMessage,
  JSONMessage,
  UserTranscriptMessage,
} from '@/models/messages';
import { keepLastN } from '@/lib/utils';
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
  
  const { currentSessionId } = useSessionContext();
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
  }, [messageHistoryLimit, sendCompletion, setMessages, onMessage]);

  return {
    sendMessage,
    lastUserMessage,
    lastAssistantMessage,
    isStreaming,
    clearMessages: useCallback(() => {
      setMessages([]);
      setLastUserMessage(null);
      setLastAssistantMessage(null);
    }, [])
  };
}
