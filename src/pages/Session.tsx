// src/pages/Session.tsx
import { useParams, useNavigate } from "react-router-dom";
import ClientComponent from "@/components/chat-window/Chat";
import { useEffect } from "react";
import { useSessionContext } from "@/contexts/SessionContext"; // Use the context

export default function Session() {
  const { sessionId: urlSessionId } = useParams(); // Get URL parameter
  const navigate = useNavigate();
  const {
    createSession,
    selectSession,
    currentSessionId,
    sessions,
    loading,
    error,
  } = useSessionContext(); // Get state and actions from context

  // Handle initial session creation and selection
  useEffect(() => {
    if (!urlSessionId && sessions.length === 0) {
      // If no session ID in URL *and* no sessions exist, create a new one
      createSession(); // This will navigate
    } else if (urlSessionId) {
      //If we have a urlSessionId, we also need to update the currentSessionId
      selectSession(urlSessionId)
    }
  }, [urlSessionId, sessions.length, createSession, selectSession, navigate]);


  //We don't need this, since the currentSessionId will update
  // useEffect(() => {
  //   if(currentSessionId) {
  //     selectSession(currentSessionId) //This will call navigate
  //   }

  // }, [currentSessionId, selectSession])

  const handleNewSession = () => {
      //Create session will do the navigation
      createSession();
  };

  if (loading) {
    return <div>Loading...</div>; // Display a loading indicator
  }

  if (error) {
    return <div>Error: {error}</div>; // Display an error message
  }
  
  // Determine the active session ID.  Prefer the context's ID.
  const activeSessionId = currentSessionId || urlSessionId;

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <ClientComponent sessionId={activeSessionId} onNewSession={handleNewSession} />
    </div>
  );
}