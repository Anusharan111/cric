/**
 * Runtime-evaluated connection config.
 * In production builds, VITE_API_BASE points the frontend at the hosted
 * backend (Vercel/Render). Falls back to same-origin (local dev server).
 */
const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "");

export const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE) || "";
