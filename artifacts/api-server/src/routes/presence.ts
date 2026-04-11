import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, presenceTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const ONLINE_THRESHOLD_MINUTES = 3;

router.get("/presence", requireAuth, async (req, res): Promise<void> => {
  const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MINUTES * 60 * 1000);
  const presence = await db.select().from(presenceTable).where(sql`${presenceTable.lastSeenAt} > ${threshold}`);
  const users = await db.select().from(usersTable);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  res.json(presence.map((p) => ({
    userId: p.userId,
    name: userMap[p.userId]?.name ?? "Unknown",
    role: userMap[p.userId]?.role ?? "BIDDER",
    lastSeenAt: p.lastSeenAt,
  })));
});

router.post("/presence", requireAuth, async (req, res): Promise<void> => {
  const me = (req as any).appUser;
  await db.insert(presenceTable)
    .values({ userId: me.id, lastSeenAt: new Date() })
    .onConflictDoUpdate({ target: presenceTable.userId, set: { lastSeenAt: new Date() } });
  res.json({ ok: true });
});

export default router;
