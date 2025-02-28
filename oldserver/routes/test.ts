import { defineEventHandler, H3Event } from 'h3';

export default defineEventHandler((event: H3Event) => {
  return {
    status: "success",
    message: "Nitro server is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  };
}); 