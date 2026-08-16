import type { IncomingMessage, ServerResponse } from "http";
import Pusher from "pusher";

// Vercel serverless API — vercel.json rewrites /api/:path* to this function.

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.PUSHER_CLUSTER || "",
  useTLS: true,
});

const hasPusherCredentials = () =>
  Boolean(process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET && process.env.PUSHER_CLUSTER);

function send(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => (data += chunk.toString()));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function parseBody(req: IncomingMessage): Promise<Record<string, string>> {
  const raw = await readBody(req);
  if (!raw) return {};
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  // pusher-js posts form-encoded by default
  const params = new URLSearchParams(raw);
  return Object.fromEntries(params.entries());
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    const path = url.pathname;
    const method = (req.method || "GET").toUpperCase();

    if (path === "/api/health" && method === "GET") {
      return send(res, 200, { status: "ok", timestamp: new Date().toISOString() });
    }

    if (path === "/api/pusher/config" && method === "GET") {
      return send(res, 200, {
        key: process.env.PUSHER_KEY || "",
        cluster: process.env.PUSHER_CLUSTER || "",
      });
    }

    if (path === "/api/pusher/auth" && method === "POST") {
      const body = await parseBody(req);
      const { socket_id, channel_name, username } = body;
      if (!socket_id || !channel_name) {
        return send(res, 400, { error: "Missing required fields" });
      }
      if (!hasPusherCredentials()) {
        return send(res, 503, { error: "Pusher credentials not configured on the server." });
      }

      const isPresence = channel_name.startsWith("presence-");
      const presenceData = isPresence
        ? {
            user_id: username ? String(username).slice(0, 64) : `user-${socket_id}`,
            user_info: { name: username || "Player" },
          }
        : undefined;

      const auth = pusher.authorizeChannel(socket_id, channel_name, presenceData);
      return send(res, 200, auth);
    }

    return send(res, 404, { error: "Not found" });
  } catch (err) {
    console.error("API error:", err);
    return send(res, 500, { error: "Internal server error" });
  }
}