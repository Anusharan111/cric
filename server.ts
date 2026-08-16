import dotenv from "dotenv";
import { createServer } from "http";
import { createServer as createViteServer } from "vite";
import path from "path";
import express from "express";
import Pusher from "pusher";

// Load environment variables
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "5176", 10);

// Pusher server SDK — used to sign channel subscription auth tokens.
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.PUSHER_CLUSTER || "",
  useTLS: true,
});

const hasPusherCredentials = () =>
  Boolean(process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET && process.env.PUSHER_CLUSTER);

// API routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Pusher config endpoint (if needed for multiplayer)
app.get("/api/pusher/config", (_req, res) => {
  res.json({
    key: process.env.PUSHER_KEY || "",
    cluster: process.env.PUSHER_CLUSTER || "",
  });
});

// Auth endpoint for Pusher — signs the socket_id + channel_name so the
// client can subscribe to private / presence channels.
app.post("/api/pusher/auth", express.json(), express.urlencoded({ extended: true }), (req, res) => {
  const { socket_id, channel_name, username } = req.body;
  if (!socket_id || !channel_name) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!hasPusherCredentials()) {
    return res.status(503).json({ error: "Pusher credentials not configured on the server." });
  }

  const isPresence = channel_name.startsWith("presence-");
  const presenceData = isPresence
    ? { user_id: username ? String(username).slice(0, 64) : `user-${socket_id}`, user_info: { name: username || "Player" } }
    : undefined;

  const auth = pusher.authorizeChannel(socket_id, channel_name, presenceData);
  res.json(auth);
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