// server/bun-server.ts

import handleWebhook from './api/clerk/clerk-webhooks'
import handleWebhookEvents from './api/clerk/webhook-events'
// import { POST as handleChatCompletions } from './api/chat/clm-sse-server'
import { POST as handleChatCompletionsTest } from './api/chat/clm-sse-server-test'
import { POST as handleEmotions } from './api/chat/emotions/hume-text-client'
import { POST as handleTitleGeneration } from './api/chat/title/generate-title'
import { 
  handleGetSessions, 
  handleCreateSession,
  handleDeleteSession,
  handleGetMessages,
  handleAddMessage,
  handleUpdateSession
} from './api/database/dbsession-handlers';

import {
  handleGenerateEmbeddings,
  handleStoreEmbedding,
} from './api/database/embedding-handlers';

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

    // Helper to add CORS headers to response
    const withCors = async (response: Response) => {
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    };

    // Session endpoints
    if (url.pathname === '/api/sessions' && req.method === 'GET') {
      return await withCors(await handleGetSessions(req));
    }
    if (url.pathname === '/api/sessions' && req.method === 'POST') {
      return await withCors(await handleCreateSession(req));
    }
    if (url.pathname.match(/^\/api\/sessions\/[\w-]+$/) && req.method === 'PUT') {
      return await withCors(await handleUpdateSession(req));
    }
    if (url.pathname.match(/^\/api\/sessions\/[\w-]+$/) && req.method === 'DELETE') {
      return await withCors(await handleDeleteSession(req));
    }
    if (url.pathname.match(/^\/api\/sessions\/[\w-]+\/messages$/) && req.method === 'GET') {
      return await withCors(await handleGetMessages(req));
    }
    if (url.pathname.match(/^\/api\/sessions\/[\w-]+\/messages$/) && req.method === 'POST') {
      return await withCors(await handleAddMessage(req));
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
      // return handleChatCompletions(req);
      return handleChatCompletionsTest(req);
    }

    // Emotions analysis
    if (url.pathname === '/api/chat/emotions' && req.method === 'POST') {
      return await withCors(await handleEmotions(req));
    }

    // Title generation
    if (url.pathname === '/api/chat/title' && req.method === 'POST') {
      return await withCors(await handleTitleGeneration(req));
    }

    // Embeddings endpoints
    if (url.pathname === '/api/embeddings/generate' && req.method === 'POST') {
      return await withCors(await handleGenerateEmbeddings(req));
    }
    if (url.pathname === '/api/embeddings/store' && req.method === 'POST') {
      return await withCors(await handleStoreEmbedding(req));
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