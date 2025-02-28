// https://nitro.unjs.io/config
import { defineNitroConfig } from 'nitropack'

export default defineNitroConfig({
  srcDir: "server",

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

  compatibilityDate: '2025-02-28'
});