import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MagnetizeButton } from "@/components/chat-input/controls/magnetize-button";
import { ArrowRight, Mic, Paperclip } from "lucide-react";
import { cn } from "@/utils";

// Add proper types for Web Speech API
declare global {
  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }

  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }

  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
    interpretation: unknown;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onaudioend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onaudiostart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onerror: ((this: SpeechRecognition, ev: Event) => void) | null;
    onnomatch: ((this: SpeechRecognition, ev: Event) => void) | null;
    onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  const SpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };

  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface ChatInputFormProps {
  onSubmit?: (text: string) => void;
  onStartCall?: () => Promise<void>;
  mode: 'text' | 'voice';
}

export function ChatInputForm({ onSubmit, onStartCall, mode }: ChatInputFormProps) {
  const [isListening, setIsListening] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [inputValue]);

  const stopRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    setIsListening(false);
  };

  const handleMicClick = async () => {
    if (isListening) {
      stopRecognition();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setIsListening(true);

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = false;
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const lastResult = event.results[event.results.length - 1];
        const transcript = lastResult[0].transcript;
        
        setInputValue(prev => {
          const prefix = prev.trim() ? prev.trim() + ' ' : '';
          return prefix + transcript.trim();
        });
      };

      recognition.onerror = () => {
        stopRecognition();
      };

      recognition.onend = () => {
        stopRecognition();
      };
      
      recognition.start();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      stopRecognition();
    }
  };

  useEffect(() => {
    return () => {
      stopRecognition();
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && onSubmit) {
      onSubmit(inputValue.trim());
      setInputValue("");
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div className="flex justify-center items-center w-full">
      <form 
        className="relative w-[600px] rounded-lg border bg-card shadow-sm focus-within:ring-1 focus-within:ring-ring"
        onSubmit={handleSubmit}
      >
        <div className="flex flex-col gap-1.5 p-4">
          <div className="flex min-h-[4.5rem] max-h-[200px] overflow-y-auto">
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type a message or use your microphone..."
              autoFocus
              className="min-h-[4.5rem] w-full resize-none rounded-lg bg-background text-base leading-relaxed focus-visible:outline-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground caret-foreground"
              style={{
                height: 'auto',
                overflow: 'hidden'
              }}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                type="button" 
                disabled
                className="text-muted-foreground hover:bg-muted"
              >
                <Paperclip className="size-4" />
                <span className="sr-only">Attach file</span>
              </Button>

              <Button
                variant="outline"
                size="icon"
                type="button"
                onClick={handleMicClick}
                className={cn(
                  "text-muted-foreground hover:bg-muted",
                  isListening && "text-red-500 animate-pulse border-red-500"
                )}
              >
                <Mic className="size-4" />
                <span className="sr-only">Use Microphone</span>
              </Button>
            </div>

            {mode === 'voice' ? (
              <MagnetizeButton 
                className="gap-1.5"
                onClick={onStartCall}
                type="button"
              >
                Start Call
                <ArrowRight className="size-3.5" />
              </MagnetizeButton>
            ) : (
              <Button 
                className="gap-1.5" 
                type="submit"
                disabled={!inputValue.trim()}
              >
                Send
                <ArrowRight className="size-3.5" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}