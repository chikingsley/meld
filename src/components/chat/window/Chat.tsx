// src/components/chat-window/Chat.tsx
import { useVoice } from "@/providers/VoiceProvider";
import Messages from "@/components/chat/window/Messages";
import BottomControls from "@/components/chat/controls/BottomControls.tsx";
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { sessionStore } from "@/db/session-store";
import { Message } from '@/types/messages';
import { useSessionStore } from "@/stores/useSessionStore";
import type { JSONMessage } from "@/types/hume-messages";
import type { ConnectionMessage } from "@/lib/hume/connection-message";
import { useUser } from '@clerk/clerk-react';
import { format, isToday, isYesterday, isSameWeek, isSameYear } from 'date-fns';
import { useMessageScroll } from '@/hooks/useMessageScroll';

interface ClientComponentProps {
  sessionId: string | null;
  scrollToMessageId?: string;
  onNewSession?: () => void;
}

export default function ClientComponent({ sessionId: urlSessionId, scrollToMessageId }: ClientComponentProps) {
  const { user } = useUser();
  const processedMessageIds = useRef(new Set<string>());
  const messageRefs = useRef<{ [key: string]: HTMLDivElement }>({});
  const { clearMessages, status } = useVoice();
  const messages = useSessionStore(state => state.messages);
  const messagesLength = useSessionStore(state => state.messages.length);
  const [storedMessages, setStoredMessages] = useState<Message[]>([]);

  // Add a new state for API messages
  const [apiMessages, setApiMessages] = useState<Message[]>([]);
  const [apiLoading, setApiLoading] = useState(false);

  // New state for continuous mode
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);

  const messageHistory = useSessionStore(state => state.messageHistory);

  // Helper function to set message refs with proper typing
  const setMessageRef = (id: string, el: HTMLDivElement | null) => {
    if (id && el) {
      messageRefs.current[id] = el;
    }
  };

  const fetchApiMessages = useCallback(async (sessionId: string) => {
    console.log('Fetching API messages triggered');
    if (!sessionId) return;

    try {
      console.log('Fetching API messages for session ID:', sessionId);
      setApiLoading(true);

      // Now using the async getMessages method that fetches from both localStorage and server
      const messages = await sessionStore.getMessages(sessionId);
      console.log('[getMessages] Received combined local and API messages:', messages);

      // In your fetchApiMessages function, ensure proper mapping:
      const typedMessages: Message[] = messages.map(apiMsg => {
        const role = (apiMsg as any).role;
        return {
          id: (apiMsg as any).id || `msg-${new Date().toISOString()}`,
          sessionId: (apiMsg as any).sessionId || urlSessionId || '',
          message: {
            role: role, // Use the actual role from the database
            content: (apiMsg as any).content || ''
          },
          timestamp: typeof (apiMsg as any).timestamp === 'string'
            ? (apiMsg as any).timestamp
            : new Date((apiMsg as any).timestamp).toISOString(),
          prosody: (apiMsg as any).metadata?.prosody || {}
        };
      });
      console.log('Mapped API messages:', typedMessages);
      setApiMessages(typedMessages);
      console.log('API messages set:', apiMessages);
    } catch (error) {
      console.error('Error fetching API messages:', error);
    } finally {
      setApiLoading(false);
    }
  }, [urlSessionId]);

  // Create a unique ID for each message based on content and role
  const createMessageId = (msg: Message | JSONMessage | ConnectionMessage, sessionId?: string) => {
    // Handle socket messages
    if ('type' in msg && (msg.type === 'socket_connected' || msg.type === 'socket_disconnected')) {
      return `${msg.type}-${msg.receivedAt.toISOString()}`;
    }
    // Handle JSON messages (with message property)
    else if ('message' in msg) {
      const content = typeof msg.message === 'object' && msg.message && 'content' in msg.message ? msg.message.content : '';
      const role = typeof msg.message === 'object' && msg.message && 'role' in msg.message ? msg.message.role : '';
      const sessionPrefix = sessionId ? `${sessionId}-` : '';
      return `${sessionPrefix}${role}-${content}`;
    }
    else if ('role' in msg && 'content' in msg) {
      const sessionPrefix = sessionId ? `${sessionId}-` : '';
      return `${sessionPrefix}${msg.role}-${msg.content}`;
    }
    else {
      return `unknown-${new Date().toISOString()}`;
    }
  };

  // Load all sessions on mount
  useEffect(() => {
    if (user?.id) {
      const sessions = sessionStore.getUserSessions(user.id);
      setAllSessions(sessions);

      // Collect messages from all sessions
      const allMessages = sessions.flatMap(session =>
        (session.messages || []).map(message => ({
          ...message,
          sessionId: session.id,
          sessionTitle: session.title || 'Untitled Session'
        }))
      );

      // Sort by timestamp
      const sortedMessages = allMessages.sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setAllMessages(sortedMessages);
    }
  }, [user?.id]);

  // Load current session messages when urlSessionId changes
  useEffect(() => {
    if (urlSessionId) {
      // Load messages using async method
      const loadMessages = async () => {
        try {
          // Now using async getMessages method
          const sessionMessages = await sessionStore.getMessages(urlSessionId);
          if (sessionMessages.length === 0) {
            clearMessages();
          }
          setStoredMessages(sessionMessages);

        } catch (error) {
          console.error('Error loading messages:', error);
          setStoredMessages([]);
        }
      };

      loadMessages();

      // Also fetch from API
      fetchApiMessages(urlSessionId);
    }
  }, [urlSessionId, fetchApiMessages]);

  // Save messages to session store
  useEffect(() => {
    if (urlSessionId && messages.length > 0) {
      // Get all messages that haven't been saved yet
      const newMessages = messages.filter(msg => {
        // Only save actual messages (not system messages)
        return msg.type === 'user_message' || msg.type === 'assistant_message';
      });

      // Create a set of existing message IDs
      const existingIds = new Set(
        storedMessages.map(msg => createMessageId(msg))
      );

      const saveNewMessages = async () => {
        // Collect messages to save
        const messagesToSave = [];
        
        for (const msg of newMessages) {
          if ('message' in msg) {
            const messageId = createMessageId(msg);
            
            // Only save if we haven't seen this message before
            if (!existingIds.has(messageId) && !processedMessageIds.current.has(messageId)) {
              const prosodyScores = msg.models?.prosody?.scores
                ? Object.entries(msg.models.prosody.scores).reduce((acc, [key, value]) => {
                  acc[key] = value;
                  return acc;
                }, {} as Record<string, number>)
                : undefined;

              const messageToSave: any = {
                message: {
                  role: msg.message.role || 'user',
                  content: msg.message.content || ''
                },
                prosody: prosodyScores,
                timestamp: msg.receivedAt?.toISOString() || new Date().toISOString(),
              };
              
              messagesToSave.push(messageToSave);
              processedMessageIds.current.add(messageId);
            }
          }
        }
        
        // Save messages sequentially but more efficiently
        for (const message of messagesToSave) {
          try {
            await sessionStore.addMessage(urlSessionId, message);
          } catch (error) {
            console.error('Error saving message:', error);
          }
        }
        
        // Then update stored messages
        try {
          const allMessages = await sessionStore.getMessages(urlSessionId);
          setStoredMessages(allMessages);
        } catch (error) {
          console.error('Error updating stored messages:', error);
        }
      };

      saveNewMessages();
    }
  }, [messagesLength, urlSessionId, status.value, user?.id]);

  // Convert all stored messages across sessions
  const convertedAllMessages = useMemo(() =>
    allMessages.map(msg => {
      // Check if the message is in the raw database format
      const isRawDatabaseFormat = 'role' in msg && 'content' in msg;

      if (isRawDatabaseFormat) {
        // Extract prosody from metadata (database format)
        const prosodyScores = msg.metadata?.prosody || {};

        return {
          id: createMessageId(msg, msg.sessionId),
          type: msg.role === 'user' ? 'user_message' : 'assistant_message',
          message: {
            role: msg.role,
            content: msg.content
          },
          models: {
            // Make sure the prosody data is properly nested
            prosody: { scores: prosodyScores },
            expressions: { scores: {} },
            labels: { scores: {} }
          },
          timestamp: msg.timestamp,
          sessionId: msg.sessionId
        };
      } else {
        // If it's already in a processed format
        // Make sure models are properly structured
        return {
          ...msg,
          type: msg.message?.role === 'user' ? 'user_message' :
            msg.message?.role === 'assistant' ? 'assistant_message' :
              'system_message',
          models: {
            prosody: {
              scores: msg.prosody || (msg.models?.prosody?.scores || {})
            },
            expressions: {
              scores: msg.expressions || (msg.models?.expressions?.scores || {})
            },
            labels: {
              scores: msg.labels || (msg.models?.labels?.scores || {})
            }
          }
        };
      }
    }),
    [allMessages]
  );

  // Add IDs and timestamps to live messages
  const messagesWithIds = useMemo(() =>
    messages.map(msg => ({
      ...msg,
      id: createMessageId(msg, urlSessionId || undefined),
      timestamp: msg.receivedAt?.toISOString() || new Date().toISOString(),
      sessionId: urlSessionId
    })),
    [messages, urlSessionId]);

  const combinedMessages = useMemo(() => {
    // Maximum number of messages to include in the combined view
    const MAX_MESSAGES = 50;
    
    // Create a stable map of messages that won't change as often
    const messageMap = new Map();

    // Add messages with priority (most recent first)
    // 1. Current session messages - most important
    messagesWithIds.forEach(msg => {
      if (msg.id) {
        messageMap.set(msg.id, msg);
      }
    });

    // 2. API messages for the current session
    apiMessages.forEach(msg => {
      const apiMsgId = msg.id || createMessageId(msg, urlSessionId || undefined);
      if (apiMsgId && !messageMap.has(apiMsgId)) {
        // Simplify the transformation to avoid complex property access
        const transformedMsg = {
          id: apiMsgId,
          type: msg.message?.role === 'user' ? 'user_message' : 'assistant_message',
          message: msg.message || { role: 'user', content: '' },
          models: {
            prosody: { scores: msg.prosody || {} }
          },
          timestamp: msg.timestamp || new Date().toISOString(),
          receivedAt: new Date(msg.timestamp || new Date()),
          sessionId: urlSessionId
        };
        messageMap.set(apiMsgId, transformedMsg);
      }
    });

    // 3. Message history - add any that aren't already in the map
    if (messageHistory && Array.isArray(messageHistory)) {
      messageHistory.forEach(msg => {
        if (msg) {
          // Use a safer approach to get ID
          const msgId = (msg.id || createMessageId(msg as any)) as string;
          if (msgId && !messageMap.has(msgId)) {
            messageMap.set(msgId, msg);
          }
        }
      });
    }
    
    // 4. Finally, add remaining converted messages
    convertedAllMessages.forEach(msg => {
      if (msg?.id && !messageMap.has(msg.id)) {
        messageMap.set(msg.id, msg);
      }
    });

    // Get sorted array of messages (newest first)
    const sortedMessages = Array.from(messageMap.values())
      .sort((a: any, b: any) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA; // Newest first
      });
    
    // Return only the most recent MAX_MESSAGES
    return sortedMessages.slice(0, MAX_MESSAGES);
  }, [messagesWithIds, apiMessages, urlSessionId, messageHistory]);

  // Add date markers and other markers
  const messagesWithMarkers = useMemo(() => {
    const result = [];
    let currentDate = null;
    let currentSessionId = null;
    let voiceSessionStart = null;
    let voiceMessages = [];

    // Sort all messages by timestamp
    const sortedMessages = [...combinedMessages].sort((a, b) => {
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });

    for (let i = 0; i < sortedMessages.length; i++) {
      const msg = sortedMessages[i];
      const msgDate = new Date(msg.timestamp);
      const dateString = msgDate.toISOString().split('T')[0];

      // Add date marker if the date changes
      if (dateString !== currentDate) {
        // Format the date nicely
        let displayDate = '';
        if (isToday(msgDate)) {
          displayDate = 'Today';
        } else if (isYesterday(msgDate)) {
          displayDate = 'Yesterday';
        } else if (isSameWeek(msgDate, new Date())) {
          displayDate = format(msgDate, 'EEEE'); // Day of week
        } else if (isSameYear(msgDate, new Date())) {
          displayDate = format(msgDate, 'MMMM d'); // Month Day
        } else {
          displayDate = format(msgDate, 'MMMM d, yyyy'); // Month Day, Year
        }

        result.push({
          type: 'date_marker',
          date: displayDate,
          timestamp: msgDate.toISOString(),
          id: `date-${dateString}`
        });
        currentDate = dateString;
      }

      // Handle session change markers
      if (msg.sessionId !== currentSessionId) {
        // End previous voice session if there was one
        if (voiceSessionStart && voiceMessages.length > 0) {
          // Simple duration calculation
          const sessionStart = new Date(voiceSessionStart);
          const sessionEnd = new Date(voiceMessages[voiceMessages.length - 1].timestamp);
          const durationMs = sessionEnd.getTime() - sessionStart.getTime();
          const minutes = Math.floor(durationMs / 60000);

          // Only add voice marker if it lasted at least a minute
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

        // Check if this might be a voice session (simplified logic)
        const session = allSessions.find(s => s.id === msg.sessionId);
        const isVoiceSession = session?.title?.toLowerCase().includes('voice') ||
          (msg.models?.prosody && Object.keys(msg.models.prosody || {}).length > 0);

        if (isVoiceSession) {
          voiceSessionStart = msg.timestamp;
          voiceMessages = [msg];
        }
      } else if (voiceSessionStart) {
        // Add to existing voice session
        voiceMessages.push(msg);
      }

      // Always add the regular message
      result.push(msg);
    }

    return result;
  }, [combinedMessages, allSessions]);

  // Using the previous Messages component, but we'll need to enhance it to handle markers
  // For backward compatibility, we'll convert markers to a format the existing Messages can handle
  const displayMessages = useMemo(() => {
    return messagesWithMarkers.map(item => {
      if (item.type === 'date_marker') {
        // Convert date marker to a format Messages component can handle
        return {
          id: item.id,
          type: 'system_message',
          message: {
            role: 'system',
            content: item.date
          },
          timestamp: item.timestamp,
          isDateMarker: true
        };
      }

      if (item.type === 'voice_call_marker') {
        // Convert voice marker to a format Messages component can handle
        return {
          id: item.id,
          type: 'system_message',
          message: {
            role: 'system',
            content: `Voice Call - ${item.duration}`
          },
          timestamp: item.timestamp,
          isVoiceMarker: true
        };
      }

      return item;
    });
  }, [messagesWithMarkers]);

  const { messagesRef } = useMessageScroll({
    messagesLength: messagesLength,
    scrollToMessageId,
    messageRefs: messageRefs.current
  });

  // Add this before your main return statement
  if (apiLoading && storedMessages.length === 0 && messages.length === 0) {
    return (
      <div className={"relative grow flex flex-col mx-auto w-full h-full overflow-hidden"}>
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-gray-900"></div>
            <div className="text-sm text-gray-500">Loading conversation...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={"relative grow flex flex-col mx-auto w-full h-full overflow-hidden"}>
      {/* 
          Note: For this to work, you need to update your Messages component to accept setMessageRef prop
          If you can't modify Messages right now, remove the setMessageRef prop below
        */}
      <Messages
        ref={messagesRef}
        messages={displayMessages}
        setMessageRef={setMessageRef}
      />
      <BottomControls
        sessionId={urlSessionId || undefined} // Convert null to undefined
        hasMessages={displayMessages.length > 0}
      />
    </div>
  );
}