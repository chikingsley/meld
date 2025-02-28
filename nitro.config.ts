// https://nitro.unjs.io/config
import { defineNitroConfig } from 'nitropack'

export default defineNitroConfig({
  srcDir: "server",

  // Explicitly set the preset to vercel
  preset: 'vercel',

  routeRules: {
    // Define route rules for any API endpoints if needed
    '/api/**': {
      cors: true,
      headers: {
        'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE',
        'Access-Control-Allow-Origin': '*'
      }
    }
  },

  compatibilityDate: '2025-02-28',

  experimental: {
    // Enable async context for better composables
    asyncContext: true
  },

  // Production specific configuration
  runtimeConfig: {
    redis: {
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN
    },
    vector: {
      url: process.env.UPSTASH_VECTOR_REST_URL,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN,
      dimensions: process.env.UPSTASH_VECTOR_DIMENSIONS || 1024,
      metric: process.env.UPSTASH_VECTOR_METRIC || 'cosine'
    },
    clerk: {
      secretKey: process.env.CLERK_SECRET_KEY,
      webhookSecret: process.env.CLERK_WEBHOOK_SECRET
    }
  }
});