// src/components/chat/window/Messages.tsx
import { cn } from "@/utils/classNames";
import Expressions from "./Expressions";
import { motion } from "framer-motion";
import { ComponentRef, forwardRef, useEffect, useRef, useState, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface MessagesProps {
  messages: any[];
  setMessageRef?: (id: string, el: HTMLDivElement | null) => void;
}

const Messages = forwardRef<
  ComponentRef<typeof motion.div>,
  MessagesProps
>(function Messages({ messages, setMessageRef }, ref) {
  // Internal ref for the container element
  const parentRef = useRef<HTMLDivElement | null>(null);
  
  // Keep track of previous message count to detect new messages
  const prevMessagesLengthRef = useRef(messages.length);
  
  // Track if we're measuring new messages
  const isMeasuringRef = useRef(false);
  
  // State to control auto-scrolling behavior
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const isAutoScrollingRef = useRef(false);
  
  // Ref for the bottom of the messages
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Initial approximate sizes - these will be updated once messages are measured
  const getInitialSize = useCallback((index: number): number => {
    const msg = messages[index];
    if (!msg) return 100;
    
    if (msg.isDateMarker) return 80;
    if (msg.isVoiceMarker) return 100;
    
    // A minimal initial guess - the size will be updated once measured
    return 150;
  }, [messages]);

  // Setup virtualizer with dynamic sizing capability
  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: getInitialSize,
    overscan: 15, // Increased to ensure more items are rendered
    // Add spacing between items that matches the original gap-4 styling
    gap: 16,
    // Configure the measure function to get sizes from the DOM
    measureElement: (el) => {
      // If element doesn't exist, return a default size
      if (!el) return 150;
      
      // Get the actual rendered height of the element
      const height = el.getBoundingClientRect().height;
      return height;
    },
    // Optional: you can make the container scrollToFn smooth for better UX
    scrollToFn: (offset, { behavior }) => {
      const element = parentRef.current;
      if (!element) return;
      
      element.scrollTo({
        top: offset,
        behavior: behavior ?? 'auto'
      });
    },
  });

  // Handle scroll events
  const handleScroll = () => {
    if (isAutoScrollingRef.current || isMeasuringRef.current) return;
    
    const element = parentRef.current;
    if (!element) return;
    
    // Check if we're near the bottom
    const isNearBottom = 
      element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    
    setShouldAutoScroll(isNearBottom);
  };

  // Force re-measurement when messages change
  useEffect(() => {
    // If messages were added, force a recalculation
    if (messages.length !== prevMessagesLengthRef.current) {
      // Reset all measurements to ensure proper layout
      virtualizer.measure();
      
      // Set flag to avoid scroll handlers during measurement
      isMeasuringRef.current = true;
      
      // Give a little time for the DOM to update
      setTimeout(() => {
        isMeasuringRef.current = false;
      }, 50);
    }
  }, [messages.length, virtualizer]);

  // Auto-scroll on new messages
  useEffect(() => {
    // Check if new messages were added
    if (messages.length > prevMessagesLengthRef.current && shouldAutoScroll) {
      setTimeout(() => {
        if (bottomRef.current) {
          isAutoScrollingRef.current = true;
          
          // Ensure latest messages are measured before scrolling
          virtualizer.measure();
          
          // Scroll to bottom
          bottomRef.current.scrollIntoView({ behavior: 'smooth' });
          
          setTimeout(() => {
            isAutoScrollingRef.current = false;
          }, 300);
        }
      }, 100);
    }
    
    // If first load with messages, scroll to bottom
    if (prevMessagesLengthRef.current === 0 && messages.length > 0) {
      setTimeout(() => {
        if (bottomRef.current) {
          virtualizer.measure();
          bottomRef.current.scrollIntoView({ behavior: 'auto' });
        }
      }, 100);
    }
    
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length, shouldAutoScroll, virtualizer]);

  // Initial scroll to bottom - only once
  useEffect(() => {
    if (bottomRef.current && messages.length > 0) {
      virtualizer.measure();
      bottomRef.current.scrollIntoView({ behavior: 'auto' });
    }
    
    // Cleanup
    return () => {
      prevMessagesLengthRef.current = 0;
    };
  }, []); // Empty deps to run only once

  // For window resize events - remeasure everything
  useEffect(() => {
    const handleResize = () => {
      virtualizer.measure();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [virtualizer]);

  // Render each message type
  const renderMessage = (msg: any) => {
    // Handle date markers
    if (msg.isDateMarker) {
      return (
        <div className="flex justify-center my-6">
          <div className="bg-muted text-muted-foreground text-xs px-4 py-1.5 rounded-full">
            {msg.message.content}
          </div>
        </div>
      );
    }

    // Handle voice call markers
    if (msg.isVoiceMarker) {
      return (
        <div
          className="flex justify-center my-6"
          ref={(el) => setMessageRef?.(msg.id, el as HTMLDivElement)}
        >
          <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg flex items-center">
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" fill="currentColor" />
              <path d="M19 12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12C5 8.13401 8.13401 5 12 5C15.866 5 19 8.13401 19 12Z" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="text-sm font-medium">{msg.message.content}</span>
          </div>
        </div>
      );
    }

    // Normal user and assistant messages
    if (
      msg.type === "user_message" ||
      msg.type === "assistant_message"
    ) {
      return (
        <div
          className={cn(
            "w-[80%]",
            "bg-card",
            "border border-border rounded",
            "my-2", // Add consistent spacing
            msg.type === "user_message" ? "ml-auto" : "",
          )}
          ref={(el) => setMessageRef?.(msg.id, el as HTMLDivElement)}
        >
          <div
            className={cn(
              "flex justify-between items-center",
              "text-xs font-medium leading-none opacity-50 pt-4 px-3",
            )}
          >
            <span className="capitalize">{msg.message.role}</span>
            {msg.timestamp && (
              <span className="text-muted-foreground">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
          </div>
          <div className={"pb-3 px-3"}>{msg.message.content}</div>
          {msg.models?.prosody?.scores && (
            <Expressions values={msg.models.prosody.scores} />
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="grow rounded-md overflow-auto p-4"
      ref={(el) => {
        // Forward the ref
        if (typeof ref === 'function') {
          ref(el);
        } else if (ref) {
          ref.current = el;
        }
        parentRef.current = el;
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
        className="max-w-2xl mx-auto"
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const msg = messages[virtualRow.index];
          if (!msg) return null;
          
          return (
            <div
              key={msg.id || `msg-${virtualRow.index}`}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
                paddingTop: '8px',
                paddingBottom: '8px'
              }}
            >
              {renderMessage(msg)}
            </div>
          );
        })}
      </div>
      
      {/* Bottom padding for controls */}
      <div className="h-44"></div>
      
      {/* Bottom anchor for scrolling */}
      <div ref={bottomRef}></div>
      
      {/* Scroll to bottom button */}
      {!shouldAutoScroll && messages.length > 5 && (
        <button
          className="fixed bottom-28 right-8 bg-primary text-white rounded-full p-3 shadow-lg z-10"
          onClick={() => {
            setShouldAutoScroll(true);
            virtualizer.measure(); // Ensure all messages are measured
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          aria-label="Scroll to bottom"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12l7 7 7-7"/>
          </svg>
        </button>
      )}
    </motion.div>
  );
});

export default Messages;