import React, { useRef, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Message } from '@/types/messages';
import { format, isToday, isYesterday, isSameWeek, isSameYear } from 'date-fns';
import { cn } from '@/utils/classNames';
import MessageGroup, { groupMessagesBySender } from './MessageGroup';
import { AnimatePresence, motion } from "framer-motion";
import Expressions from './Expressions';
import { ProsodyData } from '@/types/expressions';

interface DateSeparatorProps {
  date: Date;
}

const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  const formattedDate = useMemo(() => {
    if (isToday(date)) {
      return 'Today';
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else if (isSameWeek(date, new Date())) {
      return format(date, 'EEEE'); // Day of week
    } else if (isSameYear(date, new Date())) {
      return format(date, 'MMMM d'); // Month and day
    } else {
      return format(date, 'MMMM d, yyyy'); // Full date
    }
  }, [date]);

  return (
    <div className="flex justify-center my-6">
      <div className="bg-muted text-muted-foreground text-xs px-4 py-1.5 rounded-full">
        {formattedDate}
      </div>
    </div>
  );
};

// Helper function to add date separators between message groups
function addDateSeparators(groups: Message[][]): (Date | Message[])[] {
  if (groups.length === 0) return [];
  
  const result: (Date | Message[])[] = [];
  let currentDate = new Date(0); // Initialize with a very old date
  
  groups.forEach(group => {
    if (group.length === 0) return;
    
    const messageDate = new Date(group[0].timestamp);
    const messageDay = new Date(
      messageDate.getFullYear(),
      messageDate.getMonth(),
      messageDate.getDate()
    );
    
    if (messageDay.getTime() !== currentDate.getTime()) {
      currentDate = messageDay;
      result.push(messageDay);
    }
    
    result.push(group);
  });
  
  return result;
}

interface MessageListProps {
  messages: Message[];
  loadMoreMessages?: () => void;
  hasMoreMessages?: boolean;
  isLoading?: boolean;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  loadMoreMessages, 
  hasMoreMessages = false,
  isLoading = false
}) => {
  // Sort messages by timestamp (oldest first for chronological display)
  const sortedMessages = useMemo(() => {
    return [...messages].sort((a, b) => {
      const dateA = new Date(a.timestamp);
      const dateB = new Date(b.timestamp);
      return dateA.getTime() - dateB.getTime(); // Oldest first
    });
  }, [messages]);
  
  // Group messages
  const messageGroups = useMemo(() => {
    const groups = groupMessagesBySender(sortedMessages);
    return addDateSeparators(groups);
  }, [sortedMessages]);
  
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: messageGroups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated size of each item
    overscan: 5, // Number of items to render outside of view
  });
  
  const items = virtualizer.getVirtualItems();
  
  // Check if we need to load more messages when scrolling to the top
  const firstItem = items[0];
  const isNearTop = firstItem && firstItem.index === 0 && hasMoreMessages;
  
  React.useEffect(() => {
    if (isNearTop && hasMoreMessages && !isLoading && loadMoreMessages) {
      loadMoreMessages();
    }
  }, [isNearTop, hasMoreMessages, isLoading, loadMoreMessages]);
  
  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    if (parentRef.current && messages.length > 0) {
      parentRef.current.scrollTop = parentRef.current.scrollHeight;
    }
  }, [messages.length]);
  
  return (
    <motion.div 
      layoutScroll
      ref={parentRef}
      className="h-full overflow-auto rounded-md p-4"
    >
      {isLoading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
        </div>
      )}
      
      <motion.div
        className="max-w-2xl mx-auto w-full flex flex-col gap-4 pb-44" // Add padding to bottom to prevent overlap with controls
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          <AnimatePresence mode="popLayout">
            {items.map(virtualItem => {
              const item = messageGroups[virtualItem.index];
              
              return (
                <motion.div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 0 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  {item instanceof Date ? (
                    <div className="flex justify-center my-6">
                      <div className="bg-muted text-muted-foreground text-xs px-4 py-1.5 rounded-full">
                        {isToday(item) ? 'Today' : 
                          isYesterday(item) ? 'Yesterday' :
                          isSameWeek(item, new Date()) ? format(item, 'EEEE') :
                          isSameYear(item, new Date()) ? format(item, 'MMMM d') :
                          format(item, 'MMMM d, yyyy')}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {item.map((message, idx) => (
                        <motion.div
                          key={message.id || `msg-${idx}`}
                          className={cn(
                            "w-[80%] mb-4",
                            "bg-card",
                            "border border-border rounded",
                            message.role === "user" ? "ml-auto" : "",
                          )}
                        >
                          <div
                            className={cn(
                              "flex justify-between items-center",
                              "text-xs font-medium leading-none opacity-50 pt-4 px-3",
                            )}
                          >
                            <span className="capitalize">{message.role}</span>
                            {message.timestamp && (
                              <span className="text-muted-foreground">
                                {new Date(message.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                          </div>
                          <div className="pb-3 px-3">{message.content}</div>
                          {message.metadata?.prosody && (
                            <Expressions values={message.metadata.prosody as ProsodyData} />
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default MessageList;
