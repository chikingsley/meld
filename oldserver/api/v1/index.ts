import { defineEventHandler, H3Event } from 'h3'

export default defineEventHandler((event: H3Event) => {
  return {
    api: "v1",
    message: "API is working!",
    timestamp: new Date().toISOString()
  };
}); 