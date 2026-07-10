import axios from "axios";

// All requests go through Vite's dev proxy (see vite.config.ts): "/api" is
// forwarded to the Django server, so there's no hardcoded host and no CORS
// dance in development.
export const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});
