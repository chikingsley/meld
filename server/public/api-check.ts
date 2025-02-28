import { defineEventHandler } from 'h3';

/**
 * Simple API check in public directory
 */
export default defineEventHandler(() => {
  return {
    public: true,
    method: "api-check",
    timestamp: new Date().toISOString()
  };
}); 