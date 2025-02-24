// server/bun-server.ts

import handleWebhook from './api/clerk/clerk-webhooks'
import handleWebhookEvents from './api/clerk/webhook-events'
import { POST as handleChatCompletions } from './api/chat/clm-sse-server'
import { 
  handleGetSessions, 
  handleCreateSession,
  handleDeleteSession,
  handleGetMessages,
  handleAddMessage,
  handleUpdateSession
} from './api/database/dbsession-handlers';

// Declare global type
declare global {
  var requestCount: number;
}

const port = process.env.SERVER_PORT || 3001;

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400'
        },
      });
    }

    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    // Health check
    if (url.pathname === '/api/health') {
      return Response.json({ 
        status: 'ok',
        server: 'healthy'
      }, { 
        status: 200,
        headers: corsHeaders 
      });
    }

    // Session endpoints
    if (url.pathname === '/api/sessions' && req.method === 'GET') {
      return handleGetSessions(req);
    }
    if (url.pathname === '/api/sessions' && req.method === 'POST') {
      return handleCreateSession(req);
    }
    if (url.pathname.match(/^\/api\/sessions\/[\w-]+$/) && req.method === 'PUT') {
      return handleUpdateSession(req);
    }
    if (url.pathname.match(/^\/api\/sessions\/[\w-]+$/) && req.method === 'DELETE') {
      return handleDeleteSession(req);
    }
    if (url.pathname.match(/^\/api\/sessions\/[\w-]+\/messages$/) && req.method === 'GET') {
      return handleGetMessages(req);
    }
    if (url.pathname.match(/^\/api\/sessions\/[\w-]+\/messages$/) && req.method === 'POST') {
      return handleAddMessage(req);
    }

    // Clerk webhook
    if (url.pathname === '/api/webhooks' && req.method === 'POST') {
      const requestCount = (global.requestCount = (global.requestCount || 0) + 1);
      console.log(`Webhook request received: #${requestCount}`);
      return handleWebhook(req);
      // return Response.json({ success: true }, { headers: corsHeaders });
    }

    // Chat completions
    if (url.pathname === '/api/chat/completions' && req.method === 'POST') {
      console.log('Chat completions request received');
      return handleChatCompletions(req);
    }

    // Webhook events endpoint
    if (url.pathname === '/api/clerk/webhook-events' && req.method === 'GET') {
      const response = await handleWebhookEvents(req);
      // Add CORS headers to SSE response
      Object.entries(corsHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // User endpoints
    if (url.pathname === '/api/me' && req.method === 'GET') {
      // return handleGetMe(req);
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
});

console.log(`Server running on http://localhost:${server.port}`);