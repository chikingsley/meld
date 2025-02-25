// src/pages/VoiceSession.tsx
import ClientComponent from "@/components/chat-window/Chat";
import { useSessionContext } from "@/db/SessionContext"; // Use the context

export default function VoiceSession() {
  const {
    createSession,
    loading,
    error,
    currentSessionId,
  } = useSessionContext();

  const handleNewSession = () => {
    createSession();
  };

  // if (loading) {
  //   return <div>Loading...</div>;
  // }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <ClientComponent sessionId={currentSessionId} onNewSession={handleNewSession} />
    </div>
  );
}