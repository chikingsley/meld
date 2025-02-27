// src/pages/Session.tsx
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import ClientComponent from "@/components/chat-window/Chat";
import { useSessionContext } from "@/providers/SessionProvider";

export default function Session() {
  const {
    selectSession,
    createSession,
    loading,
    error,
    currentSessionId,
  } = useSessionContext();
  
  // Get sessionId from URL params
  const { sessionId } = useParams();
  
  // If we have a sessionId in the URL, use it
  // Otherwise, we're in timeline view (sessionId will be null)
  const activeSessionId = sessionId || currentSessionId;
  
  // Use useEffect to sync the sessionId from URL with context
  useEffect(() => {
    if (sessionId && sessionId !== currentSessionId) {
      selectSession(sessionId);
    }
  }, [sessionId, currentSessionId, selectSession]);

  const handleNewSession = () => {
    createSession();
  };

  if (error) {
    return <div>Error: {error.toString()}</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <ClientComponent 
        sessionId={activeSessionId} 
        onNewSession={handleNewSession}
        isTimelineView={!sessionId} // Pass this flag to ClientComponent
      />
    </div>
  );
}