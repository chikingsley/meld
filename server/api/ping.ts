import { defineEventHandler } from 'h3';

/**
 * Ultra simple ping endpoint to test API routing
 */
export default defineEventHandler(() => {
  return {
    pong: true,
    time: new Date().toISOString()
  };
}); 