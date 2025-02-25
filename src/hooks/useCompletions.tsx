// src/hooks/useCompletions.ts
import { useCallback, useState } from 'react';
import type { JSONMessage } from '@/models/messages';

interface CompletionsConfig {
  sessionId: string;
  onMessage?: (message: JSONMessage) => void;
}

export function useCompletions({ sessionId, onMessage }: CompletionsConfig) {
  const [isStreaming, setIsStreaming] = useState(false);
  
  const sendMessage = useCallback(async (content: string, messageHistory: { role: string; content: string }[] = []) => {
    setIsStreaming(true);
    try {
      const response = await fetch(`/api/chat/completions?custom_session_id=${sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream"
        },
        body: JSON.stringify({
          messages: [...messageHistory, { role: 'user', content }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle streaming response...
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let lastMessage: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6); // Remove 'data: '
            if (data === '[DONE]') continue;

            try {
              // Parse server message and keep track of content
              const message = JSON.parse(data);
              const content = message.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
                lastMessage = message;
              }
            } catch (e) {
              console.error('Error parsing message:', e);
            }
          }
        }
      }

      // Send final message with complete content
      if (lastMessage && fullContent) {
        // Wait for final emotions analysis
        const response = await fetch('/api/chat/emotions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: fullContent })
        });
        const emotionScores = await response.json();

        onMessage?.({
          type: 'assistant_message',
          id: lastMessage.id,
          fromText: true,
          message: {
            role: 'assistant',
            content: fullContent
          },
          receivedAt: new Date(lastMessage.choices[0].time?.end || Date.now()),
          models: {
            prosody: { scores: emotionScores }
          }
        });
      }
    } finally {
      setIsStreaming(false);
    }
  }, [sessionId, onMessage]);

  return {
    sendMessage,
    isStreaming
  };
}