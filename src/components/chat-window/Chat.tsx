// src/components/chat-window/Chat.tsx
import { useVoice } from "@/lib/VoiceProvider";
import Messages from "./Messages";
import BottomControls from "../chat-input/BottomControls";
import { ComponentRef, useEffect, useRef, useState, useMemo } from "react";
import { sessionStore, StoredMessage } from "@/db/session-store";
import { useSessionStore } from "@/stores/useSessionStore";
import type { JSONMessage } from "@/models/messages";
import type { ConnectionMessage } from "@/lib/connection-message";
import { useUser } from '@clerk/clerk-react';
import { format, isToday, isYesterday, isSameWeek, isSameYear } from 'date-fns';

interface ClientComponentProps {
  sessionId: string | null;
  scrollToMessageId?: string;
  onNewSession?: () => void;
}

// First, let's define a modified interface for the Messages component
// You'll need to also update your actual Messages component to match this
interface ExtendedMessagesProps {
  messages: any[];
  setMessageRef?: (id: string, el: HTMLDivElement | null) => void;
}

export default function ClientComponent({ sessionId: urlSessionId, scrollToMessageId }: ClientComponentProps) {
  const { user } = useUser();
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{[key: string]: HTMLDivElement}>({});
  
  const { clearMessages, status } = useVoice();
  const messages = useSessionStore(state => state.messages);
  const messagesLength = useSessionStore(state => state.messages.length);
  const [storedMessages, setStoredMessages] = useState<StoredMessage[]>([]);
  
  // New state for continuous mode
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [allStoredMessages, setAllStoredMessages] = useState<any[]>([]);

  // Create a unique ID for each message based on content and role
  const createMessageId = (msg: StoredMessage | JSONMessage | ConnectionMessage, sessionId?: string) => {
    if ('type' in msg && (msg.type === 'socket_connected' || msg.type === 'socket_disconnected')) {
      return `${msg.type}-${msg.receivedAt.toISOString()}`;
    } else if ('message' in msg) {
      const content = typeof msg.message === 'object' && msg.message && 'content' in msg.message ? msg.message.content : '';
      const role = typeof msg.message === 'object' && msg.message && 'role' in msg.message ? msg.message.role : '';
      const sessionPrefix = sessionId ? `${sessionId}-` : '';
      return `${sessionPrefix}${role}-${content}`;
    }
    return `${msg.type || 'unknown'}-${msg.receivedAt?.toISOString() || new Date().toISOString()}`;
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
      
      setAllStoredMessages(sortedMessages);
    }
  }, [user?.id]);

  // Load current session messages when urlSessionId changes
  useEffect(() => {
    if (urlSessionId) {
      const messages = sessionStore.getMessages(urlSessionId);
      setStoredMessages(messages);
      if (messages.length === 0) {
        clearMessages();
      }
    }
  }, [urlSessionId, clearMessages]);

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

      newMessages.forEach(msg => {
        if ('message' in msg) {
          const messageId = createMessageId(msg);
          // Only save if we haven't seen this message before
          if (!existingIds.has(messageId)) {
            // Convert EmotionScores to Record<string, number>
            const prosodyScores = msg.models?.prosody?.scores
              ? Object.entries(msg.models.prosody.scores).reduce((acc, [key, value]) => {
                  acc[key] = value;
                  return acc;
                }, {} as Record<string, number>)
              : undefined;

            const storedMessage: StoredMessage = {
              message: {
                role: msg.message.role || 'user',
                content: msg.message.content || ''
              },
              prosody: prosodyScores,
              timestamp: msg.receivedAt?.toISOString() || new Date().toISOString(),
            };
            
            // Only pass urlSessionId if it's not null
            if (urlSessionId) {
              sessionStore.addMessage(urlSessionId, storedMessage);
            }
          }
        }
      });

      // Update stored messages to include the new ones
      const allMessages = sessionStore.getMessages(urlSessionId);
      setStoredMessages(allMessages);
      
      // Also refresh all sessions when messages change
      if (user?.id) {
        const sessions = sessionStore.getUserSessions(user.id);
        setAllSessions(sessions);
        
        // Update all stored messages
        const allMessages = sessions.flatMap(session => 
          (session.messages || []).map(message => ({
            ...message,
            sessionId: session.id,
            sessionTitle: session.title || 'Untitled Session'
          }))
        );
        
        const sortedMessages = allMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        
        setAllStoredMessages(sortedMessages);
      }
    }
  }, [messagesLength, urlSessionId, status.value, user?.id]);

  // Convert stored messages for the current session
  const convertedStoredMessages = useMemo(() => 
    storedMessages.map(msg => ({
      id: createMessageId(msg, urlSessionId || undefined),
      type: msg.message.role === 'user' ? 'user_message' : 'assistant_message',
      message: msg.message,
      models: {
        prosody: { scores: msg.prosody },
        expressions: { scores: msg.expressions },
        labels: { scores: msg.labels }
      },
      timestamp: msg.timestamp,
      sessionId: urlSessionId
    })), 
  [storedMessages, urlSessionId]);

  // Convert all stored messages across sessions
  const convertedAllStoredMessages = useMemo(() => 
    allStoredMessages.map(msg => ({
      id: createMessageId(msg, msg.sessionId),
      type: msg.message.role === 'user' ? 'user_message' : 'assistant_message',
      message: msg.message,
      models: {
        prosody: { scores: msg.prosody },
        expressions: { scores: msg.expressions },
        labels: { scores: msg.labels }
      },
      timestamp: msg.timestamp,
      sessionId: msg.sessionId
    })),
  [allStoredMessages]);

  // Add IDs and timestamps to live messages
  const messagesWithIds = useMemo(() => 
    messages.map(msg => ({
      ...msg,
      id: createMessageId(msg, urlSessionId || undefined),
      timestamp: msg.receivedAt?.toISOString() || new Date().toISOString(),
      sessionId: urlSessionId
    })),
  [messages, urlSessionId]);

  // Combine and deduplicate all messages
  const combinedMessages = useMemo(() => {
    const messageMap = new Map();
    
    // Add all messages from all sessions first
    convertedAllStoredMessages.forEach(msg => {
      if (msg.id) {
        messageMap.set(msg.id, msg);
      }
    });
    
    // Then add current session's messages, which will override if there are duplicates
    messagesWithIds.forEach(msg => {
      if (msg.id) {
        messageMap.set(msg.id, msg);
      }
    });

    return Array.from(messageMap.values());
  }, [convertedAllStoredMessages, messagesWithIds]);

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

  // Handle scrolling to specific message
  useEffect(() => {
    if (scrollToMessageId && messageRefs.current[scrollToMessageId]) {
      messageRefs.current[scrollToMessageId].scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [scrollToMessageId, messagesWithMarkers]);

  // Handle auto-scrolling
  useEffect(() => {
    if (timeout.current) {
      window.clearTimeout(timeout.current);
    }

    timeout.current = window.setTimeout(() => {
      if (!scrollToMessageId && ref.current) {
        const scrollHeight = ref.current.scrollHeight;
        ref.current.scrollTo({
          top: scrollHeight,
          behavior: "smooth",
        });
      }
    }, 200);
  }, [messagesLength, scrollToMessageId]);

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

  // Helper function to set message refs with proper typing
  const setMessageRef = (id: string, el: HTMLDivElement | null) => {
    if (id && el) {
      messageRefs.current[id] = el;
    }
  };

  return (
    <div className={"relative grow flex flex-col mx-auto w-full h-full overflow-hidden"}>
        {/* 
          Note: For this to work, you need to update your Messages component to accept setMessageRef prop
          If you can't modify Messages right now, remove the setMessageRef prop below
        */}
        <Messages 
          ref={ref} 
          messages={displayMessages} 
          // Temporarily comment this out if you can't modify Messages component yet
          // setMessageRef={setMessageRef}
        />
        <BottomControls 
          sessionId={urlSessionId || undefined} // Convert null to undefined
          hasMessages={displayMessages.length > 0}
        />
    </div>
  );
}