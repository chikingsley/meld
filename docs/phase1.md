Phase 1: Fix the WebSocket Disconnection (Highest Priority)
Start here since this is your main issue:

Improve the reconnection logic in useVoiceClient.ts:
javascriptCopy// Focus on these changes first:
const maxReconnectAttempts = 5; // Increase from 1

// Add better connection tracking with a ref
const isConnectingRef = useRef(false);

// Update your connect function to use this ref instead of state
if (isConnectingRef.current) {
  return reject(new Error('Connection attempt already in progress'));
}
isConnectingRef.current = true;
setIsConnecting(true);

// Always reset in finally blocks
try {
  // connection logic
} catch (error) {
  // error handling
} finally {
  isConnectingRef.current = false;
  setIsConnecting(false);
}

Add simple connection monitoring:
javascriptCopy// In VoiceProvider.tsx, add a basic heartbeat
useEffect(() => {
  if (client.readyState !== VoiceReadyState.OPEN) return;
  
  const heartbeat = setInterval(() => {
    try {
      // Simple ping or empty message to keep connection alive
      client.current?.socket?.send(JSON.stringify({ type: 'ping' }));
    } catch (e) {
      console.warn('Heartbeat failed, connection may be unstable');
    }
  }, 20000); // Every 20 seconds
  
  return () => clearInterval(heartbeat);
}, [client.readyState]);