// server/bun-server.ts

// Declare global type
declare global {
  var requestCount: number;
}

import { PrismaClient } from "@prisma/client"
import handleWebhook from './api/clerk/clerk-webhooks'
// import handleGetMe from './api/user/routes'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

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
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400'
        },
      });
    }

    // Add CORS headers to all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    // Health check
    if (url.pathname === '/api/health') {
      const dbHealth = await prisma.$queryRaw`SELECT 1`
      .then(() => 'connected')
      .catch(() => 'disconnected');
    
    return Response.json({ 
      status: 'ok',
      database: dbHealth 
    }, { headers: corsHeaders });
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
      return Response.json({ success: true }, { headers: corsHeaders });
    }

    // User endpoints
    if (url.pathname === '/api/me' && req.method === 'GET') {
      // return handleGetMe(req);
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
});

console.log(`Server running on http://localhost:${server.port}`);