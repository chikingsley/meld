// src/pages/Session.tsx
import { useParams } from "react-router-dom";
import ClientComponent from "@/components/chat-window/Chat";

export default function Session() {
  const { sessionId } = useParams();

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <ClientComponent />
    </div>
  );
}