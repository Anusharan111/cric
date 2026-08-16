import dotenv from "dotenv";
import { createServer } from "http";
import { createServer as createViteServer } from "vite";
import path from "path";
import express from "express";

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "5176", 10);

// API routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Pusher config endpoint (if needed for multiplayer)
app.get("/api/pusher/config", (_req, res) => {
  res.json({ 
    key: process.env.PUSHER_KEY || "", 
    cluster: process.env.PUSHER_CLUSTER || "" 
  });
});

// Auth endpoint for Pusher
app.post("/api/pusher/auth", express.json(), (req, res) => {
  const { socket_id, channel_name, username } = req.body;
  if (!socket_id || !channel_name || !username) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  // In production, use Pusher server SDK to authenticate
  // For now, allow all
  res.json({ auth: "" });
});

async function startServer() {
  const httpServer = createServer(app);

  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite dev middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});