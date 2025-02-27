import { useState, useCallback, useEffect, useRef } from 'react';
import { prismaStore } from '@/db/prisma-store';
import { Message } from '@/types/messages';
import MessageList from './MessageList';
import BottomControls from '@/components/chat/controls/BottomControls';
import { useText } from '@/providers/TextProvider';

interface ChatContainerProps {
  sessionId?: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ sessionId }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [page, setPage] = useState(1);
  const lastLoadedSessionId = useRef<string | undefined>(undefined);
  
  // Set a reasonable page size for loading messages
  const PAGE_SIZE = 20;
  
  // Load messages for a session
  const loadMessages = useCallback(async (sid: string, pageNum: number = 1) => {
    if (!sid) return;
    
    setIsLoading(true);
    try {
      // Use the correct method from prismaStore
      const result = await prismaStore.getMessages(sid);
      
      // Sort messages by timestamp (oldest first)
      const sortedMessages = [...result].sort((a: any, b: any) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateA.getTime() - dateB.getTime();
      });
      
      // Simple pagination on the client side
      const startIdx = (pageNum - 1) * PAGE_SIZE;
      const endIdx = startIdx + PAGE_SIZE;
      const hasMore = sortedMessages.length > endIdx;
      const pageMessages = sortedMessages.slice(startIdx, Math.min(sortedMessages.length, endIdx));
      
      const typedMessages: Message[] = pageMessages.map((msg: any) => ({
        id: msg.id || `msg-${Date.now()}`,
        sessionId: msg.sessionId || sid,
        content: msg.content || '',
        role: (msg.role === 'user' || msg.role === 'assistant') ? msg.role : 'user',
        timestamp: msg.timestamp || new Date().toISOString(),
        metadata: {
          prosody: msg.metadata?.prosody
        }
      }));
      
      if (pageNum === 1) {
        // First page, replace all messages
        setMessages(typedMessages);
      } else {
        // Subsequent pages, append messages at the beginning (older messages)
        setMessages(prev => [...typedMessages, ...prev]);
      }
      
      setHasMoreMessages(hasMore);
      
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Load more messages (pagination)
  const loadMoreMessages = useCallback(() => {
    if (!sessionId || isLoading || !hasMoreMessages) return;
    
    const nextPage = page + 1;
    setPage(nextPage);
    loadMessages(sessionId, nextPage);
  }, [sessionId, isLoading, hasMoreMessages, page, loadMessages]);
  
  // Effect to load messages when sessionId changes
  useEffect(() => {
    if (sessionId && sessionId !== lastLoadedSessionId.current) {
      setPage(1);
      lastLoadedSessionId.current = sessionId;
      loadMessages(sessionId, 1);
    }
  }, [sessionId, loadMessages]);
  
  // Handle message events from TextProvider
  const handleMessageEvent = useCallback((message: any) => {
    if (sessionId) {
      // Reload messages to get the latest, including any server-side processing
      loadMessages(sessionId, 1);
    }
  }, [sessionId, loadMessages]);
  
  // Use the TextProvider hook to handle text messages
  const { sendMessage: sendTextMessage } = useText({
    messageHistoryLimit: 100,
    onMessage: handleMessageEvent
  });
  
  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-hidden relative">
        <MessageList
          messages={messages}
          loadMoreMessages={loadMoreMessages}
          hasMoreMessages={hasMoreMessages}
          isLoading={isLoading}
        />
      </div>
      <div className="w-full">
        <BottomControls
          sessionId={sessionId}
          hasMessages={messages.length > 0}
          handleTextSubmit={sendTextMessage}
        />
      </div>
    </div>
  );
};

export default ChatContainer;
