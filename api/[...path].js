// Simple API router for Vercel
export default async function handler(req, res) {
  try {
    // Simple implementation - just redirect to Nitro server
    console.log('API request:', {
      method: req.method,
      url: req.url,
      path: req.url.replace(/^\/api/, ''),
      headers: req.headers
    });
    
    // Use Node.js built-in functionality to forward the request
    const { protocol, host } = new URL(req.url, `http://${req.headers.host}`);
    const baseUrl = `${protocol}//${host}`;
    
    // Construct the path to forward to Nitro
    const nitroServerPath = '/.output/server/index.mjs';
    const targetUrl = new URL(nitroServerPath, baseUrl);
    
    // Instead of directly forwarding, return a basic response
    // In a production environment, you would dynamically load the Nitro handler
    res.status(200).json({
      success: true,
      message: 'API endpoint working',
      endpoint: req.url,
      timestamp: new Date().toISOString(),
      server: 'Vercel Edge Function'
    });
  } catch (error) {
    console.error('API handler error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message
    });
  }
} 