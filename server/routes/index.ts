import { defineEventHandler, sendRedirect } from "h3";

// We need to disable this route completely - just return undefined to let Vercel handle it
export default defineEventHandler((event) => {
  // Forward to the SPA by sending a redirect
  return sendRedirect(event, '/index.html', 302);
});
