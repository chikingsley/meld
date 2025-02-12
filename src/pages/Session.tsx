import { useParams, useNavigate } from "react-router-dom";
import ClientComponent from "@/components/chat-window/Chat";
import { useSessions } from "@/hooks/use-sessions";
import { useEffect } from "react";

export default function Session() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { createSession, selectSession, sessions } = useSessions();

  // Handle initial session
  useEffect(() => {
    if (!sessionId && sessions.length === 0) {
      const newSessionId = createSession();
      if (newSessionId) {
        navigate(`/session/${newSessionId}`);
      }
    } else if (sessionId) {
      selectSession(sessionId);
    }
  }, [sessionId, sessions.length]);

  const handleNewSession = () => {
    const newSessionId = createSession();
    if (newSessionId) {
      navigate(`/session/${newSessionId}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <ClientComponent 
        sessionId={sessionId} 
        onNewSession={handleNewSession}
      />
    </div>
  );
}