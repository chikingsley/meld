// src/hooks/useChat.ts
import { useMemo, useEffect } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { useUser } from '@clerk/clerk-react';
import { sessionStore } from '@/db/session-store';
import { format, isToday, isYesterday, isSameWeek, isSameYear } from 'date-fns';
import type { Message } from '@/types/messages';

// Helper function moved from Chat.tsx
const createMessageId = (msg: Message, sessionId?: string) => {
  if ('type' in msg) {
    return `${msg.type}-${new Date().toISOString()}`;
  } else {
    const sessionPrefix = sessionId ? `${sessionId}-` : '';
    return `${sessionPrefix}${msg.role}-${msg.content}`;
  }
};

export function useChat(sessionId: string | null) {
  const { user } = useUser();
  const store = useChatStore();
  
  // Load messages only once when sessionId changes
  useEffect(() => {
    if (sessionId) {
      // Use a flag to prevent multiple loads
      let isSubscribed = true;

      const loadMessages = async () => {
        try {
          const messages = sessionStore.getMessages(sessionId);
          if (isSubscribed) {
            store.setMessages(messages);
          }
          
          // Fetch API messages after setting local messages
          const apiMessages = await store.fetchApiMessages(sessionId);
          if (isSubscribed && apiMessages) {
            // Merge API messages with local messages
            const combined = [...messages, ...apiMessages];
            store.setMessages(combined);
          }
        } catch (error) {
          console.error('Error loading messages:', error);
        }
      };

      loadMessages();

      // Cleanup function
      return () => {
        isSubscribed = false;
      };
    }
  }, [sessionId]); // Remove store from dependencies

  // Load all sessions for user
  useEffect(() => {
    if (user?.id) {
      store.loadUserSessions(user.id);
    }
  }, [user?.id, store]);

  // Convert messages with IDs
  const messagesWithIds = useMemo(() =>
    store.messages.map(msg => ({
      ...msg,
      id: createMessageId(msg, sessionId || undefined),
      timestamp: new Date().toISOString(),
      sessionId
    })),
  [store.messages, sessionId]);

  // Add date markers and other markers
  const messagesWithMarkers = useMemo(() => {
    const result = [];
    let currentDate = null;
    let currentSessionId = null;
    let voiceSessionStart = null;
    let voiceMessages: any[] = [];

    // Sort all messages by timestamp
    const sortedMessages = [...store.allMessages].sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    for (const msg of sortedMessages) {
      const msgDate = new Date(msg.timestamp);
      const dateString = msgDate.toISOString().split('T')[0];

      // Add date marker if the date changes
      if (dateString !== currentDate) {
        let displayDate = '';
        if (isToday(msgDate)) {
          displayDate = 'Today';
        } else if (isYesterday(msgDate)) {
          displayDate = 'Yesterday';
        } else if (isSameWeek(msgDate, new Date())) {
          displayDate = format(msgDate, 'EEEE');
        } else if (isSameYear(msgDate, new Date())) {
          displayDate = format(msgDate, 'MMMM d');
        } else {
          displayDate = format(msgDate, 'MMMM d, yyyy');
        }

        result.push({
          type: 'date_marker',
          date: displayDate,
          timestamp: msgDate.toISOString(),
          id: `date-${dateString}`
        });
        currentDate = dateString;
      }

      // Handle session changes
      if (msg.sessionId !== currentSessionId) {
        if (voiceSessionStart && voiceMessages.length > 0) {
          const sessionStart = new Date(voiceSessionStart);
          const sessionEnd = new Date(voiceMessages[voiceMessages.length - 1].timestamp);
          const durationMs = sessionEnd.getTime() - sessionStart.getTime();
          const minutes = Math.floor(durationMs / 60000);

          if (minutes > 0) {
            result.push({
              type: 'voice_call_marker',
              duration: `${minutes} minute${minutes !== 1 ? 's' : ''}`,
              timestamp: sessionStart.toISOString(),
              id: `voice-${sessionStart.toISOString()}`
            });
          }

          voiceMessages = [];
          voiceSessionStart = null;
        }

        currentSessionId = msg.sessionId;

        const session = store.allSessions.find(s => s.id === msg.sessionId);
        const isVoiceSession = session?.title?.toLowerCase().includes('voice') ||
          (msg.metadata?.prosody && Object.keys(msg.metadata.prosody || {}).length > 0);

        if (isVoiceSession) {
          voiceSessionStart = msg.timestamp;
          voiceMessages = [msg];
        }
      } else if (voiceSessionStart) {
        voiceMessages.push(msg);
      }

      result.push(msg);
    }

    return result;
  }, [store.allMessages, store.allSessions]);

  return {
    messages: messagesWithMarkers,
    isLoading: store.apiLoading,
    addMessage: store.addMessage,
    clearMessages: store.clearMessages,
    storedMessages: store.storedMessages,
    apiMessages: store.apiMessages
  };
}