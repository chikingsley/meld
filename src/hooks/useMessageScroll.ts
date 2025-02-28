// src/hooks/useMessageScroll.ts
import { useEffect, useRef, ComponentRef } from 'react';
import type Messages from '@/components/chat/window/Messages';

interface UseMessageScrollOptions {
  messagesLength: number;
  scrollToMessageId?: string;
  messageRefs: { [key: string]: HTMLDivElement };
}

export function useMessageScroll({ 
  messagesLength, 
  scrollToMessageId,
  messageRefs
}: UseMessageScrollOptions) {
  const timeout = useRef<number | null>(null);
  const messagesRef = useRef<ComponentRef<typeof Messages> | null>(null);

  // Handle scrolling to specific message
  useEffect(() => {
    if (scrollToMessageId && messageRefs[scrollToMessageId]) {
      messageRefs[scrollToMessageId].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [scrollToMessageId, messageRefs]);

  // Handle auto-scrolling
  useEffect(() => {
    if (timeout.current) {
      window.clearTimeout(timeout.current);
    }

    timeout.current = window.setTimeout(() => {
      if (!scrollToMessageId && messagesRef.current) {
        const scrollHeight = messagesRef.current.scrollHeight;
        messagesRef.current.scrollTo({
          top: scrollHeight,
          behavior: "smooth",
        });
      }
    }, 200);

    return () => {
      if (timeout.current) {
        window.clearTimeout(timeout.current);
      }
    };
  }, [messagesLength, scrollToMessageId]);

  return {
    messagesRef
  };
}