import { defineEventHandler, sendRedirect } from "h3";

export default defineEventHandler((event) => {
  // Redirect to the frontend app
  return sendRedirect(event, "/index.html");
});
