import { useVoice } from "@humeai/voice-react";
import Messages from "./Messages";
import { BottomControls } from "../chat-input/BottomControls";
import { ComponentRef, useEffect, useRef } from "react";

export default function ClientComponent() {
  const timeout = useRef<number | null>(null);
  const ref = useRef<ComponentRef<typeof Messages> | null>(null);
  const { messages } = useVoice();  // Get messages from useVoice

  // Handle auto-scrolling
  useEffect(() => {
    if (timeout.current) {
      window.clearTimeout(timeout.current);
    }

    timeout.current = window.setTimeout(() => {
      if (ref.current) {
        const scrollHeight = ref.current.scrollHeight;
        ref.current.scrollTo({
          top: scrollHeight,
          behavior: "smooth",
        });
      }
    }, 200);
  }, [messages]); // Scroll when messages change

  return (
    <div className={"relative grow flex flex-col mx-auto w-full h-full overflow-hidden"}>
        <Messages ref={ref} />
        <BottomControls />
    </div>
  );
}
