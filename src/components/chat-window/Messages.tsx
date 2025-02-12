// src/components/chat-window/Messages.tsx
import { cn } from "@/utils";
import { useVoice } from "@/lib/hume-lib/VoiceProvider";
import Expressions from "./Expressions";
import { AnimatePresence, motion } from "framer-motion";
import { ComponentRef, forwardRef } from "react";

interface MessagesProps {
  messages: any[];
}

const Messages = forwardRef<
  ComponentRef<typeof motion.div>,
  MessagesProps
>(function Messages({ messages }, ref) {

  return (
    <motion.div
      layoutScroll
      className={"grow rounded-md overflow-auto p-4"}
      ref={ref}
    >
      <motion.div
        className={"max-w-2xl mx-auto w-full flex flex-col gap-4 pb-24"}
      >
        <AnimatePresence mode={"popLayout"}>
          {messages.map((msg, index) => {
            if (
              msg.type === "user_message" ||
              msg.type === "assistant_message"
            ) {
              return (
                <motion.div
                  key={msg.type + index}
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
