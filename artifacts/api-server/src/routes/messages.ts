import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, messagesTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/messages", requireAuth, async (req, res): Promise<void> => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const messages = await db.select().from(messagesTable).orderBy(sql`${messagesTable.createdAt} DESC`).limit(limit);
  const users = await db.select().from(usersTable);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  res.json(messages.reverse().map((m) => ({
    id: m.id,
    senderId: m.senderId,
    senderName: userMap[m.senderId]?.name ?? null,
    senderRole: userMap[m.senderId]?.role ?? null,
    content: m.content,
    createdAt: m.createdAt,
  })));
});

router.post("/messages", requireAuth, async (req, res): Promise<void> => {
  const me = req.appUser!;
  const { content } = req.body;
  if (!content) {
    res.status(400).json({ error: "Content is required" });
    return;
  }
  const [msg] = await db.insert(messagesTable).values({ senderId: me.id, content }).returning();
  res.status(201).json({
    id: msg.id,
    senderId: msg.senderId,
    senderName: me.name,
    senderRole: me.role,
    content: msg.content,
    createdAt: msg.createdAt,
  });
});

export default router;
