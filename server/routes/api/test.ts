import { defineEventHandler, H3Event } from 'h3';

export default defineEventHandler(async (event: H3Event) => {
  return {
    status: "success",
    message: "API server is running!",
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  };
}); 