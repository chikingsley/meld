const port = process.env.SERVER_PORT || 3001;

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    
    // Health check
    if (url.pathname === '/api/health') {
      return Response.json({ status: 'ok' });
    }

    // Clerk webhook
    if (url.pathname === '/api/clerk/webhook' && req.method === 'POST') {
      return Response.json({ success: true });
    }

    // Chat completions
    if (url.pathname === '/api/chat/completions' && req.method === 'POST') {
      return Response.json({ success: true });
    }

    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Server running on http://localhost:${server.port}`);
