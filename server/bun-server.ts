// server/bun-server.ts
// import handleWebhook from './api/clerk/clerk-webhooks';

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
      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    // Clerk webhook
    if (url.pathname === '/api/webhooks' && req.method === 'POST') {
      console.log('hahahahahh');
      // return handleWebhook(req);
      // return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    // Chat completions
    if (url.pathname === '/api/chat/completions' && req.method === 'POST') {
      return Response.json({ success: true }, { headers: corsHeaders });
    }

    // Test endpoint
    if (url.pathname === '/api/test' && req.method === 'GET') {
      return Response.json({ message: 'Hot reload is working!' }, { headers: corsHeaders });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
});

console.log(`Server running on http://localhost:${server.port}`);
