// src/components/chat-window/Chat.tsx
import { useVoice } from "@/lib/VoiceProvider";
import Messages from "./Messages";
import BottomControls from "../chat-input/BottomControls";
import { ComponentRef, useEffect, useRef, useState } from "react";
import { sessionStore, StoredMessage } from "@/db/session-store";
import { useSessionStore } from "@/stores/useSessionStore";
import type { JSONMessage } from "@/models/messages";
import type { ConnectionMessage } from "@/lib/connection-message";

interface ClientComponentProps {
  sessionId: string | null;
  onNewSession?: () => void;
}

export default function ClientComponent({ sessionId: urlSessionId }: ClientComponentProps) {
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);
  const { clearMessages, status } = useVoice();
  const messages = useSessionStore(state => state.messages);
  const messagesLength = useSessionStore(state => state.messages.length);
  const [storedMessages, setStoredMessages] = useState<StoredMessage[]>([]);

  // Create a unique ID for each message based on content and role
  const createMessageId = (msg: StoredMessage | JSONMessage | ConnectionMessage) => {
    if ('type' in msg && (msg.type === 'socket_connected' || msg.type === 'socket_disconnected')) {
      return `${msg.type}-${msg.receivedAt.toISOString()}`;
    } else if ('message' in msg) {
      const content = typeof msg.message === 'object' && msg.message && 'content' in msg.message ? msg.message.content : '';
      const role = typeof msg.message === 'object' && msg.message && 'role' in msg.message ? msg.message.role : '';
      return `${role}-${content}`;
    }
    return `${msg.type || 'unknown'}-${msg.receivedAt.toISOString()}`;
  };

  // Convert stored messages and add IDs
  const convertedStoredMessages = storedMessages.map(msg => ({
    id: createMessageId(msg),
    type: msg.message.role === 'user' ? 'user_message' : 'assistant_message',
    message: msg.message,
    models: {
      prosody: { scores: msg.prosody },
      expressions: { scores: msg.expressions },
      labels: { scores: msg.labels }
    },
    timestamp: msg.timestamp
  }));

  // Add IDs and timestamps to live messages
  const messagesWithIds = messages.map(msg => ({
    ...msg,
    id: createMessageId(msg),
    timestamp: new Date().toISOString()
  }));

  // Deduplicate messages by ID, preferring live messages over stored ones
  const messageMap = new Map();
  [...convertedStoredMessages, ...messagesWithIds].forEach(msg => {
    if (msg.id) {
      messageMap.set(msg.id, msg);
    }
  });

  const displayMessages = Array.from(messageMap.values());

  // Load session messages on mount or session change
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
    if (urlSessionId && messages.length > 0 && status.value === 'connected') {
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
              timestamp: new Date().toISOString(),
            };
            sessionStore.addMessage(urlSessionId, storedMessage);
          }
        }
      });

      // Update stored messages to include the new ones
      const allMessages = sessionStore.getMessages(urlSessionId);
      setStoredMessages(allMessages);
    }
  }, [messagesLength, urlSessionId, status.value]);

  // Handle auto-scrolling
  useEffect(() => {
    if (timeout.current) {
      window.clearTimeout(timeout.current);
    }

    timeout.current = window.setTimeout(() => {
      if (ref.current) {
        const scrollHeight = ref.current.scrollHeight;
        ref.current.scrollTo({
          top: scrollHeight,
          behavior: "smooth",
        });
      }
    }, 200);
  }, [messagesLength]); // Scroll when number of messages changes

  return (
    <div className={"relative grow flex flex-col mx-auto w-full h-full overflow-hidden"}>
        <Messages ref={ref} messages={displayMessages} />
        <BottomControls 
          sessionId={urlSessionId || undefined}
          hasMessages={displayMessages.length > 0}
        />
    </div>
  );
}
