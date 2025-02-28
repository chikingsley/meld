import { defineEventHandler, sendRedirect } from "h3";

export default defineEventHandler(() => {
  // We don't need to handle this route anymore
  // All SPA routes will be handled by vercel.json rewrites
  return {
    message: "API server is running. Frontend routes are handled by the SPA."
  };
});
