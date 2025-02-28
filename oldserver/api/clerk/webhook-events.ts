// server/api/clerk/webhook-events.ts

// Store event streams for each user
const userEventStreams = new Map<string, ReadableStreamDefaultController<Uint8Array>[]>();

// Send a heartbeat every 30 seconds to keep the connection alive
const HEARTBEAT_INTERVAL = 30 * 1000;

export function emitUserEvent(userId: string, data: any) {
  const controllers = userEventStreams.get(userId);
  if (controllers) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    console.log(`[${new Date().toISOString()}] Emitting event for user ${userId}:`, data);
    
    controllers.forEach(controller => {
      try {
        controller.enqueue(new TextEncoder().encode(message));
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error sending event to user ${userId}:`, error);
      }
    });
  } else {
    console.log(`[${new Date().toISOString()}] No active streams for user ${userId}`);
  }
}

// Send a heartbeat message to keep the connection alive
function sendHeartbeat(controller: ReadableStreamDefaultController<Uint8Array>) {
  try {
    const heartbeat = `data: {"type":"heartbeat"}\n\n`;
    controller.enqueue(new TextEncoder().encode(heartbeat));
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error sending heartbeat:`, error);
  }
}

export default async function handleWebhookEvents(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    console.error(`[${new Date().toISOString()}] Missing userId in webhook-events request`);
    return new Response(JSON.stringify({ error: 'Missing userId parameter' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log(`[${new Date().toISOString()}] New SSE connection for user ${userId}`);

  // Create a new stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const initialMessage = `data: {"type":"connected"}\n\n`;
      controller.enqueue(new TextEncoder().encode(initialMessage));

      // Add this controller to the user's streams
      if (!userEventStreams.has(userId)) {
        userEventStreams.set(userId, []);
      }
      userEventStreams.get(userId)?.push(controller);
      console.log(`[${new Date().toISOString()}] Added stream controller for user ${userId}. Total streams: ${userEventStreams.get(userId)?.length}`);

      // Start heartbeat with proper binding
      const boundSendHeartbeat = () => sendHeartbeat(controller);
      const heartbeatInterval = setInterval(boundSendHeartbeat, HEARTBEAT_INTERVAL);

      // Clean up when the stream ends
      return () => {
        clearInterval(heartbeatInterval);
        const controllers = userEventStreams.get(userId);
        if (controllers) {
          const index = controllers.indexOf(controller);
          if (index > -1) {
            controllers.splice(index, 1);
            console.log(`[${new Date().toISOString()}] Removed stream controller for user ${userId}. Remaining streams: ${controllers.length}`);
          }
          if (controllers.length === 0) {
            userEventStreams.delete(userId);
            console.log(`[${new Date().toISOString()}] Removed all streams for user ${userId}`);
          }
        }
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
