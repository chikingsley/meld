// src/hooks/useMessageScroll.ts
import { useEffect, useRef } from 'react';
import type { ComponentRef } from 'react';
import type Messages from '@/components/chat/window/Messages';

export function useMessageScroll(
  scrollToMessageId: string | undefined,
  messagesLength: number
) {
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);
  const messageRefs = useRef<{ [key: string]: HTMLDivElement }>({});

  // Scroll to specific message
  useEffect(() => {
    if (scrollToMessageId && messageRefs.current[scrollToMessageId]) {
      messageRefs.current[scrollToMessageId].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [scrollToMessageId]);

  // Auto-scroll to bottom
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

    return () => {
      if (timeout.current) {
        window.clearTimeout(timeout.current);
      }
    };
  }, [messagesLength, scrollToMessageId]);

  const setMessageRef = (id: string, el: HTMLDivElement | null) => {
    if (id && el) {
      messageRefs.current[id] = el;
    }
  };

  return {
    ref,
    setMessageRef
  };
}