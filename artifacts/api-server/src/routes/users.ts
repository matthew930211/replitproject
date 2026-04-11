import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const user = req.appUser!;
  res.json({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    role: user.role,
    managerId: user.managerId,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

router.get("/users", requireAuth, requireRole("CHIEF_ADMIN", "BIDDER_MANAGER"), async (req, res): Promise<void> => {
  const me = req.appUser!;
  const roleFilter = req.query.role as string | undefined;
  const users = await db.select().from(usersTable);
  const filtered = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (me.role === "BIDDER_MANAGER") {
      return u.managerId === me.id || u.id === me.id;
    }
    return true;
  });
  res.json(filtered.map((u) => ({
    id: u.id,
    clerkId: u.clerkId,
    email: u.email,
    name: u.name,
    role: u.role,
    managerId: u.managerId,
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  })));
});

router.post("/users", requireAuth, requireRole("CHIEF_ADMIN"), async (req, res): Promise<void> => {
  const { email, name, role, managerId } = req.body as { email?: string; name?: string; role?: string; managerId?: number | null };
  if (!email || !name || !role) {
    res.status(400).json({ error: "Missing required fields: email, name, role" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "A user with that email already exists" });
    return;
  }
  const placeholderClerkId = `pending_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const [user] = await db.insert(usersTable).values({ clerkId: placeholderClerkId, email, name, role: role as "CHIEF_ADMIN" | "BIDDER_MANAGER" | "BIDDER", managerId: managerId ?? null }).returning();
  res.status(201).json({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    role: user.role,
    managerId: user.managerId,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

router.get("/users/:id", requireAuth, requireRole("CHIEF_ADMIN", "BIDDER_MANAGER"), async (req, res): Promise<void> => {
  const me = req.appUser!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (me.role === "BIDDER_MANAGER" && user.managerId !== me.id && user.id !== me.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  res.json({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    role: user.role,
    managerId: user.managerId,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

router.patch("/users/:id", requireAuth, requireRole("CHIEF_ADMIN"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { name, role, managerId, isActive } = req.body as {
    name?: string;
    role?: "CHIEF_ADMIN" | "BIDDER_MANAGER" | "BIDDER";
    managerId?: number | null;
    isActive?: boolean;
  };
  const updateData: Partial<{ name: string; role: "CHIEF_ADMIN" | "BIDDER_MANAGER" | "BIDDER"; managerId: number | null; isActive: boolean }> = {};
  if (name != null) updateData.name = name;
  if (role != null) updateData.role = role;
  if (managerId !== undefined) updateData.managerId = managerId;
  if (isActive != null) updateData.isActive = isActive;
  const [user] = await db.update(usersTable).set(updateData).where(eq(usersTable.id, id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    clerkId: user.clerkId,
    email: user.email,
    name: user.name,
    role: user.role,
    managerId: user.managerId,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

router.post("/users/sync", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { email, name } = req.body as { email?: string; name?: string };

  const byClerkId = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (byClerkId.length > 0) {
    const u = byClerkId[0];
    res.json({ id: u.id, clerkId: u.clerkId, email: u.email, name: u.name, role: u.role, managerId: u.managerId, isActive: u.isActive, createdAt: u.createdAt, updatedAt: u.updatedAt });
    return;
  }

  if (email) {
    const byEmail = await db.select().from(usersTable).where(eq(usersTable.email, email));
    const pending = byEmail.find(u => u.clerkId.startsWith("pending_"));
    if (pending) {
      const [updated] = await db.update(usersTable)
        .set({ clerkId, name: name ?? pending.name })
        .where(eq(usersTable.id, pending.id))
        .returning();
      res.json({ id: updated.id, clerkId: updated.clerkId, email: updated.email, name: updated.name, role: updated.role, managerId: updated.managerId, isActive: updated.isActive, createdAt: updated.createdAt, updatedAt: updated.updatedAt });
      return;
    }
  }

  const [user] = await db.insert(usersTable).values({
    clerkId,
    email: email ?? "",
    name: name ?? "New User",
    role: "BIDDER",
  }).returning();
  res.status(201).json({ id: user.id, clerkId: user.clerkId, email: user.email, name: user.name, role: user.role, managerId: user.managerId, isActive: user.isActive, createdAt: user.createdAt, updatedAt: user.updatedAt });
});

export default router;
