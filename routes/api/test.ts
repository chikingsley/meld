import { defineEventHandler } from 'h3';

/**
 * Simple test API endpoint following Nitro's Vercel-compatible structure
 */
export default defineEventHandler(() => {
  return {
    status: "success",
    message: "API endpoint is working correctly with routes/api structure!",
    timestamp: new Date().toISOString()
  };
}); 