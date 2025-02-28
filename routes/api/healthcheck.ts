import { defineEventHandler } from 'h3';

/**
 * A bare-minimum health check endpoint with no dependencies
 * Used to verify the Nitro server is functioning
 */
export default defineEventHandler(() => {
  return {
    status: "online",
    service: "nitro-server",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  };
}); 