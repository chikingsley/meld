// This is a Vercel API function that handles the root /api endpoint
// It will forward the request to our Nitro server

// Import the Nitro server handler
import handler from '../.output/server/index.mjs';

export default function (req, res) {
  // Log the request for debugging
  console.log(`[Vercel Function] Root API handler received request for: ${req.url}`);
  
  // Call the Nitro handler
  return handler(req, res);
} 