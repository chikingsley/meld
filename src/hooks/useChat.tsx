// src/hooks/useChat.ts
import { useMemo, useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/useChatStore';
import { useUser } from '@clerk/clerk-react';
import { sessionStore } from '@/db/session-store';
import { format, isToday, isYesterday, isSameWeek, isSameYear } from 'date-fns';
import type { Message } from '@/types/messages';
import { createMessageId } from '@/utils/message-utils';

interface DateMarker {
  type: 'date_marker';
  date: string;
  timestamp: string;
  id: string;
}

interface VoiceCallMarker {
  type: 'voice_call_marker';
  duration: string;
  timestamp: string;
  id: string;
}

type MarkerMessage = DateMarker | VoiceCallMarker | Message;

export function useChat(sessionId: string | null) {
  const { user } = useUser();
  const store = useChatStore();
  const loadingRef = useRef<boolean>(false);
  const sessionLoadedRef = useRef<string | null>(null);
  
  // Load messages only once when sessionId changes
  useEffect(() => {
    if (!sessionId || loadingRef.current || sessionLoadedRef.current === sessionId) {
      return;
    }

    let isSubscribed = true;
    loadingRef.current = true;

    const loadMessages = async () => {
      try {
        console.log('[useChat] Loading messages for session:', sessionId);
        
        // First load local messages
        const messages = sessionStore.getMessages(sessionId);
        if (isSubscribed) {
          store.setCurrentMessages(messages);
        }
        
        // Then fetch API messages if we haven't loaded this session yet
        if (sessionLoadedRef.current !== sessionId) {
          console.log('[useChat] Fetching API messages for session:', sessionId);
          await store.fetchApiMessages(sessionId);
          if (isSubscribed) {
            sessionLoadedRef.current = sessionId;
          }
        }
      } catch (error) {
        console.error('[useChat] Error loading messages:', error);
      } finally {
        if (isSubscribed) {
          loadingRef.current = false;
        }
      }
    };

    loadMessages();

    return () => {
      isSubscribed = false;
      loadingRef.current = false;
    };
  }, [sessionId, store]);

  // Load all sessions for user only once when user is loaded
  useEffect(() => {
    let isMounted = true;
    const loadSessions = async () => {
      // Skip if no user, sessions already loaded, or store is currently loading
      if (!user?.id || store.allSessions.length > 0 || store.isLoading) {
        return;
      }

      try {
        console.log('[useChat] Starting to load user sessions for:', user.id);
        await store.loadUserSessions(user.id);
        
        if (isMounted) {
          console.log('[useChat] Successfully loaded sessions for:', user.id);
        }
      } catch (error) {
        if (isMounted) {
          console.error('[useChat] Error loading user sessions:', error);
          // Don't throw here - we've logged the error and the store has been reset
        }
      }
    };

    loadSessions();

    return () => {
      isMounted = false;
    };
  }, [user?.id, store, store.isLoading, store.allSessions.length]);

  // Convert messages with IDs
  const messagesWithIds = useMemo(() =>
    store.currentMessages.map(msg => ({
      ...msg,
      id: createMessageId(msg, sessionId || undefined),
      timestamp: new Date().toISOString(),
      sessionId
    })),
  [store.currentMessages, sessionId]);

  // Add date markers and other markers
  const messagesWithMarkers = useMemo(() => {
    const result: MarkerMessage[] = [];
    let currentDate: string | null = null;
    let currentSessionId: string | null = null;
    let voiceSessionStart: string | null = null;
    let voiceMessages: Message[] = [];

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
          voiceSessionStart = typeof msg.timestamp === 'string' ? msg.timestamp : msg.timestamp.toISOString();
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
    isLoading: store.isLoading,
    addMessage: store.addMessage,
    clearMessages: store.clearMessages,
    storedMessages: store.storedMessages,
    apiMessages: store.apiMessages
  };
}