import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import { verifyToken } from "@clerk/express";
import { db, usersTable, messagesTable, presenceTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./lib/logger";

interface AuthenticatedSocket extends WebSocket {
  userId: number;
  clerkId: string;
  userName: string;
  userRole: string;
  isAlive: boolean;
}

const clients = new Set<AuthenticatedSocket>();

function broadcastPresence() {
  const onlineUsers = Array.from(clients).map((c) => ({
    userId: c.userId,
    name: c.userName,
    role: c.userRole,
  }));
  const uniqueUsers = Array.from(
    new Map(onlineUsers.map((u) => [u.userId, u])).values()
  );
  const payload = JSON.stringify({ type: "presence:update", data: uniqueUsers });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

async function broadcastMessage(msg: {
  id: number;
  senderId: number;
  senderName: string | null;
  senderRole: string | null;
  content: string;
  createdAt: Date | string;
}) {
  const payload = JSON.stringify({ type: "chat:message", data: msg });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

export { broadcastMessage };

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: "/api/ws" });

  const heartbeatInterval = setInterval(() => {
    for (const client of clients) {
      if (!client.isAlive) {
        clients.delete(client);
        client.terminate();
        broadcastPresence();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  wss.on("connection", async (ws: WebSocket, req) => {
    const socket = ws as AuthenticatedSocket;

    try {
      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const token = url.searchParams.get("token");

      if (!token) {
        socket.close(4001, "Missing token");
        return;
      }

      const secretKey = process.env["CLERK_SECRET_KEY"];
      if (!secretKey) {
        socket.close(4500, "Server config error");
        return;
      }

      let clerkId: string;
      try {
        const verified = await verifyToken(token, { secretKey });
        clerkId = verified.sub;
      } catch {
        socket.close(4001, "Invalid token");
        return;
      }

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.clerkId, clerkId));

      if (!user || !user.isActive) {
        socket.close(4003, "User not found or inactive");
        return;
      }

      socket.userId = user.id;
      socket.clerkId = clerkId;
      socket.userName = user.name;
      socket.userRole = user.role;
      socket.isAlive = true;

      clients.add(socket);

      await db
        .insert(presenceTable)
        .values({ userId: user.id, lastSeenAt: new Date() })
        .onConflictDoUpdate({
          target: presenceTable.userId,
          set: { lastSeenAt: new Date() },
        });

      broadcastPresence();

      logger.info({ userId: user.id, name: user.name }, "WebSocket connected");

      socket.on("pong", () => {
        socket.isAlive = true;
      });

      socket.on("message", async (raw) => {
        try {
          const data = JSON.parse(raw.toString());

          if (data.type === "chat:send") {
            const content = data.content?.trim();
            if (!content) return;

            const [msg] = await db
              .insert(messagesTable)
              .values({ senderId: socket.userId, content })
              .returning();

            await broadcastMessage({
              id: msg.id,
              senderId: msg.senderId,
              senderName: socket.userName,
              senderRole: socket.userRole,
              content: msg.content,
              createdAt: msg.createdAt,
            });
          }

          if (data.type === "presence:heartbeat") {
            await db
              .insert(presenceTable)
              .values({ userId: socket.userId, lastSeenAt: new Date() })
              .onConflictDoUpdate({
                target: presenceTable.userId,
                set: { lastSeenAt: new Date() },
              });
            socket.isAlive = true;
          }
        } catch (err) {
          logger.error({ err }, "WebSocket message error");
        }
      });

      socket.on("close", () => {
        clients.delete(socket);
        broadcastPresence();
        logger.info({ userId: socket.userId }, "WebSocket disconnected");
      });

      socket.on("error", (err) => {
        logger.error({ err, userId: socket.userId }, "WebSocket error");
        clients.delete(socket);
      });
    } catch (err) {
      logger.error({ err }, "WebSocket connection setup error");
      socket.close(4500, "Internal error");
    }
  });

  logger.info("WebSocket server initialized at /ws");
}
