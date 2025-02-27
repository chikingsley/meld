// src/components/chat-window/ContinuousChat.tsx
import Messages from "@/components/chat/window/Messages";
import BottomControls from "@/components/chat/controls/BottomControls.tsx";
import { ComponentRef, useEffect, useRef, useState, useMemo } from "react";
import type { JSONMessage } from "@/types/hume-messages";
import type { ConnectionMessage } from "@/lib/hume/connection-message";
import { useUser } from '@clerk/clerk-react';
import { format, isToday, isYesterday, isSameWeek, isSameYear } from 'date-fns';

interface ContinuousChatProps {
  currentSessionId: string | null;
  scrollToMessageId?: string;
  onNewSession?: () => void;
}

export default function ContinuousChat({ currentSessionId, scrollToMessageId }: ContinuousChatProps) {
  const { user } = useUser();
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<{[key: string]: HTMLDivElement}>({});
  

  // Generate sample messages for testing
  const sampleMessages = useMemo(() => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const createMessage = (type: string, role: string, content: string, date: Date, emotions: Record<string, number>) => ({
      type,
      message: { role, content },
      receivedAt: date,
      timestamp: date.toISOString(),
      models: { prosody: { scores: emotions } }
    });

    return [
      createMessage(
        'user_message',
        'user',
        'Tell me about machine learning',
        lastWeek,
        { confident: 0.8, neutral: 0.2 }
      ),
      createMessage(
        'assistant_message',
        'assistant',
        'Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed.',
        new Date(lastWeek.getTime() + 1000), // 1 second later
        { informative: 0.9, engaging: 0.7 }
      ),
      createMessage(
        'user_message',
        'user',
        'How does voice recognition work?',
        yesterday,
        { curious: 0.9, engaged: 0.8 }
      ),
      createMessage(
        'assistant_message',
        'assistant',
        'Voice recognition systems use complex algorithms to convert spoken words into text. This typically involves processing audio signals, breaking them down into phonemes, and using machine learning models to match them to words.',
        new Date(yesterday.getTime() + 1000), // 1 second later
        { helpful: 0.95, knowledgeable: 0.85 }
      ),
      createMessage(
        'user_message',
        'user',
        'What are the latest developments in AI?',
        now,
        { excited: 0.7, curious: 0.9 }
      ),
      createMessage(
        'assistant_message',
        'assistant',
        'Recent developments in AI include advances in large language models, multimodal AI systems that can work with text, images, and audio, and improvements in reinforcement learning.',
        new Date(now.getTime() + 1000), // 1 second later
        { enthusiastic: 0.8, informative: 0.9 }
      )
    ];
  }, []);
  
  // Create a unique ID for each message
  const createMessageId = (msg: any) => {
    const timestamp = msg.timestamp || (msg.receivedAt instanceof Date ? msg.receivedAt.toISOString() : msg.receivedAt);
    return `${msg.type}-${msg.message.role}-${msg.message.content}-${timestamp}`;
  };

  // Add date markers between days
  const messagesWithDateMarkers = useMemo(() => {
    const result = [];
    let currentDate = null;
    let currentSessionId = null;
    let voiceSessionStart = null;
    let voiceMessages = [];
    
    // Sort sample messages by timestamp
    const sortedMessages = [...sampleMessages].sort((a, b) => {
      const getTime = (msg: any) => {
        if (msg.timestamp) return new Date(msg.timestamp).getTime();
        if (msg.receivedAt instanceof Date) return msg.receivedAt.getTime();
        if (typeof msg.receivedAt === 'string') return new Date(msg.receivedAt).getTime();
        return new Date().getTime();
      };
      return getTime(a) - getTime(b);
    });

    // Add IDs to messages
    const messagesWithIds = sortedMessages.map(msg => ({
      ...msg,
      id: createMessageId(msg)
    }));

    for (let i = 0; i < messagesWithIds.length; i++) {
      const msg = messagesWithIds[i];
      const timestamp = msg.timestamp || (msg.receivedAt instanceof Date ? msg.receivedAt.toISOString() : msg.receivedAt);
      const msgDate = new Date(timestamp);
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
      
      // Handle voice session markers
      // This is a simplified approach - you'd need to enhance this with real voice session detection
      if (msg.sessionId !== currentSessionId) {
        // End previous voice session if there was one
        if (voiceSessionStart && voiceMessages.length > 0) {
          // Calculate duration from first to last message
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
              summary: `Conversation about ${getSummaryTopic(voiceMessages)}`,
              id: `voice-${sessionStart.toISOString()}`
            });
          }
          
          voiceMessages = [];
          voiceSessionStart = null;
        }
        
        currentSessionId = msg.sessionId;
        
        // Check if this might be a voice session
        const isVoiceSession = msg.sessionTitle?.toLowerCase().includes('voice') || 
                              (msg.models?.prosody && Object.keys(msg.models.prosody).length > 0);
        
        if (isVoiceSession) {
          voiceSessionStart = msg.timestamp;
          voiceMessages = [msg];
        }
      } else if (voiceSessionStart) {
        // Add to existing voice session
        voiceMessages.push(msg);
      }
      
      // Add the message
      result.push(msg);
    }
    
    // Handle any final voice session
    if (voiceSessionStart && voiceMessages.length > 0) {
      const sessionStart = new Date(voiceSessionStart);
      const sessionEnd = new Date(voiceMessages[voiceMessages.length - 1].timestamp);
      const durationMs = sessionEnd.getTime() - sessionStart.getTime();
      const minutes = Math.floor(durationMs / 60000);
      
      if (minutes > 0) {
        // Insert the voice marker at the correct position based on timestamp
        const markerIndex = result.findIndex(item => 
          item.timestamp && new Date(item.timestamp) > sessionStart
        );
        
        if (markerIndex !== -1) {
          result.splice(markerIndex, 0, {
            type: 'voice_call_marker',
            duration: `${minutes} minute${minutes !== 1 ? 's' : ''}`,
            timestamp: sessionStart.toISOString(),
            summary: `Conversation about ${getSummaryTopic(voiceMessages)}`,
            id: `voice-${sessionStart.toISOString()}`
          });
        } else {
          const startTimestamp = sessionStart.toISOString();
          result.push({
            type: 'voice_call_marker',
            duration: `${minutes} minute${minutes !== 1 ? 's' : ''}`,
            timestamp: startTimestamp,
            summary: `Conversation about ${getSummaryTopic(voiceMessages)}`,
            id: `voice-${startTimestamp}`
          });
        }
      }
    }
    
    return result;
  }, [sampleMessages]);

  // Helper to generate a topic summary from voice messages
  function getSummaryTopic(messages) {
    // This is a placeholder - in a real app, you'd use NLP or AI to generate summaries
    // For now, just grab some keywords from the first few messages
    const allText = messages
      .filter(m => m.message && m.message.content)
      .slice(0, 3)
      .map(m => m.message.content)
      .join(' ');
      
    const words = allText.split(' ');
    if (words.length <= 3) return "general topics";
    
    // Just pick a few words as a naive "summary"
    const keywords = words.filter(w => w.length > 4).slice(0, 3);
    return keywords.length > 0 ? keywords.join(', ') : "general conversation";
  }

  // Handler for scrolling to specific message
  useEffect(() => {
    if (scrollToMessageId && messageRefs.current[scrollToMessageId]) {
      messageRefs.current[scrollToMessageId].scrollIntoView({ 
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [scrollToMessageId, messagesWithDateMarkers]);

  // Handle auto-scrolling to bottom on new messages
  useEffect(() => {
    if (timeout.current) {
      window.clearTimeout(timeout.current);
    }

    timeout.current = window.setTimeout(() => {
      if (!scrollToMessageId && messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }, 200);
  }, [scrollToMessageId]);



  return (
    <div className="relative grow flex flex-col mx-auto w-full h-full overflow-hidden">
      <Messages
        ref={ref}
        messages={messagesWithDateMarkers}
      />
      
      <BottomControls 
        sessionId={undefined}
        hasMessages={messagesWithDateMarkers.length > 0}
      />
    </div>
  );
}