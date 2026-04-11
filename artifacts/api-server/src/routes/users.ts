import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).appUser;
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

router.get("/users", requireAuth, async (req, res): Promise<void> => {
  const me = (req as any).appUser;
  const roleFilter = req.query.role as string | undefined;
  let query = db.select().from(usersTable);
  const users = await query;
  const filtered = users.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    if (me.role === "BIDDER") return u.id === me.id;
    if (me.role === "BIDDER_MANAGER") return u.managerId === me.id || u.id === me.id;
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
  const { clerkId, email, name, role, managerId } = req.body;
  if (!clerkId || !email || !name || !role) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [user] = await db.insert(usersTable).values({ clerkId, email, name, role, managerId: managerId ?? null }).returning();
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

router.get("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
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

router.patch("/users/:id", requireAuth, async (req, res): Promise<void> => {
  const me = (req as any).appUser;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  if (me.role !== "CHIEF_ADMIN" && me.id !== id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { name, role, managerId, isActive } = req.body;
  const updateData: any = {};
  if (name != null) updateData.name = name;
  if (me.role === "CHIEF_ADMIN") {
    if (role != null) updateData.role = role;
    if (managerId !== undefined) updateData.managerId = managerId;
    if (isActive != null) updateData.isActive = isActive;
  }
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

// Auto-register user on first sign-in
router.post("/users/sync", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkId = auth?.userId;
  if (!clerkId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { email, name } = req.body;
  const existing = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (existing.length > 0) {
    const u = existing[0];
    res.json({ id: u.id, clerkId: u.clerkId, email: u.email, name: u.name, role: u.role, managerId: u.managerId, isActive: u.isActive, createdAt: u.createdAt, updatedAt: u.updatedAt });
    return;
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
