// src/components/chat/window/Messages.tsx
import { cn } from "@/utils/classNames";
import Expressions from "./Expressions";
import { AnimatePresence, motion } from "framer-motion";
import { ComponentRef, forwardRef } from "react";

interface MessagesProps {
  messages: any[];
  setMessageRef?: (id: string, el: HTMLDivElement | null) => void;
}

const Messages = forwardRef<
  ComponentRef<typeof motion.div>,
  MessagesProps
>(function Messages({ messages, setMessageRef }, ref) {
  return (
    <motion.div
      layoutScroll
      className={"grow rounded-md overflow-auto p-4"}
      ref={ref}
    >
      <motion.div
        className={"max-w-2xl mx-auto w-full flex flex-col gap-4 pb-44"}
      >
        <AnimatePresence mode={"popLayout"}>
          {messages.map((msg, index) => {
            // Handle date markers
            if (msg.isDateMarker) {
              return (
                <motion.div
                  key={msg.id || `date-${index}`}
                  className="flex justify-center my-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 0 }}
                >
                  <div className="bg-muted text-muted-foreground text-xs px-4 py-1.5 rounded-full">
                    {msg.message.content}
                  </div>
                </motion.div>
              );
            }

            // Handle voice call markers
            if (msg.isVoiceMarker) {
              return (
                <motion.div
                  key={msg.id || `voice-${index}`}
                  className="flex justify-center my-6"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 0 }}
                  ref={(el) => setMessageRef?.(msg.id, el as HTMLDivElement)}
                >
                  <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg flex items-center">
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" fill="currentColor" />
                      <path d="M19 12C19 15.866 15.866 19 12 19C8.13401 19 5 15.866 5 12C5 8.13401 8.13401 5 12 5C15.866 5 19 8.13401 19 12Z" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span className="text-sm font-medium">{msg.message.content}</span>
                  </div>
                </motion.div>
              );
            }

            // Normal user and assistant messages
            if (
              msg.type === "user_message" ||
              msg.type === "assistant_message"
            ) {
              return (
                <motion.div
                  key={msg.id || `msg-${index}`}
                  className={cn(
                    "w-[80%]",
                    "bg-card",
                    "border border-border rounded",
                    msg.type === "user_message" ? "ml-auto" : "",
                  )}
                  initial={{
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{
                    opacity: 0,
                    y: 0,
                  }}
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
                </motion.div>
              );
            }
            return null;
          })}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
});

export default Messages;