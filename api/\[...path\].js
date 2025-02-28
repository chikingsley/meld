// This is a Vercel API function that serves as an entry point for all API requests
// It will forward the request to our Nitro server

// Import the Nitro server handler
import handler from '../.output/server/index.mjs';

export default function (req, res) {
  // Log the request for debugging
  console.log(`[Vercel Function] Received request for: ${req.url}`);
  
  // Call the Nitro handler
  return handler(req, res);
} 