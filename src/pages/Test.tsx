// src/pages/Test.tsx
import { useEffect, useRef, useState } from "react";
import Messages from "@/components/chat-window/Messages";
async function analyzeEmotions(text: string) {
  try {
    const response = await fetch('/api/chat/emotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error analyzing emotions:', error);
    return {};
  }
}

interface Message {
  id: string;
  type: "user_message" | "assistant_message";
  message: {
    role: "user" | "assistant";
    content: string;
  };
  timestamp: string;
  models?: {
    prosody?: {
      scores: Record<string, number>;
    };
    expressions?: {
      scores: Record<string, number>;
    };
  };
  receivedAt: Date;
}

export default function Test() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesRef = useRef<HTMLDivElement>(null);
  
  const sendMessage = async (content: string) => {
    try {
    // Add user message
    const now = new Date();
    const userMessage: Message = {
      id: `user-${now.getTime()}`,
      type: "user_message",
      message: {
        role: "user",
        content
      },
      timestamp: now.toISOString(),
      models: {
        prosody: { scores: await analyzeEmotions(content) }
      },
      receivedAt: now
    };
    
    setMessages(prev => [...prev, userMessage]);
    console.log('Sent user message:', userMessage);
    setInput("");
    } catch (error) {
      console.error('Error analyzing emotions:', error);
      return;
    }

    try {
      const response = await fetch("/api/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.message.role,
            content: m.message.content,
            models: m.models
          }))
        })
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      const now = new Date();
      let assistantMessage: Message = {
        id: `assistant-${now.getTime()}`,
        type: "assistant_message",
        message: {
          role: "assistant",
          content: ""
        },
        timestamp: now.toISOString(),
        receivedAt: now
      };

      // Keep track of all messages and final state
      let currentAssistantMessage = assistantMessage;
      let finalContent = '';
      let finalScores = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split("\n").filter(Boolean);

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataContent = line.slice(5).trim();
            
            // Skip [DONE] message without trying to parse it
            if (dataContent === "[DONE]") {
              continue;
            }
            
            // Only try to parse non-[DONE] messages
            try {
              const data = JSON.parse(dataContent);
              
              if (data.type === "content" || data.choices?.[0]?.delta?.content) {
                const content = data.type === "content" ? data.value : data.choices[0].delta.content;
                const emotionScores = data.models?.prosody?.scores || {};
                finalContent += content;
                finalScores = emotionScores;

                currentAssistantMessage = {
                  ...currentAssistantMessage,
                  message: {
                    ...currentAssistantMessage.message,
                    content: currentAssistantMessage.message.content + content
                  },
                  models: {
                    prosody: { 
                      scores: emotionScores
                    }
                  }
                };

                // Update messages, preserving all previous messages except current assistant
                setMessages(prevMessages => {
                  // Keep all messages except the current assistant message we're updating
                  const previousMessages = prevMessages.filter(m => m.id !== currentAssistantMessage.id);
                  const updatedMessages = [...previousMessages, currentAssistantMessage];
                  return updatedMessages;
                });
              }
            } catch (e) {
              if (dataContent !== "[DONE]") {
                console.error("Error parsing SSE data:", e, "\nData content:", dataContent);
              }
            }
          }
        }
      }

      // Log final state
      console.log('Final assistant message:', {
        content: finalContent,
        emotions: finalScores
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-auto" ref={messagesRef}>
        <Messages messages={messages} />
      </div>
      <div className="p-4 border-t">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) {
              sendMessage(input.trim());
            }
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 px-4 py-2 border rounded"
            placeholder="Type a message..."
          />
          <button 
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded"
            disabled={!input.trim()}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
