import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, bidderProfilesTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/profiles", requireAuth, requireRole("CHIEF_ADMIN", "BIDDER_MANAGER"), async (req, res): Promise<void> => {
  const profiles = await db.select().from(bidderProfilesTable).orderBy(bidderProfilesTable.userId);
  const users = await db.select().from(usersTable);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  res.json(profiles.map((p) => ({
    id: p.id,
    userId: p.userId,
    userName: userMap[p.userId]?.name ?? null,
    bio: p.bio,
    phone: p.phone,
    address: p.address,
    birthDate: p.birthDate,
    photoObjectPath: p.photoObjectPath,
    resumeObjectPath: p.resumeObjectPath,
    resumeFileName: p.resumeFileName,
    skills: p.skills,
    experience: p.experience,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  })));
});

router.get("/profiles/:userId", requireAuth, async (req, res): Promise<void> => {
  const me = req.appUser!;
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(rawId, 10);

  if (me.role === "BIDDER" && me.id !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const [profile] = await db.select().from(bidderProfilesTable).where(eq(bidderProfilesTable.userId, userId));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!profile) {
    res.json({
      id: null,
      userId,
      userName: user?.name ?? null,
      bio: null,
      phone: null,
      address: null,
      birthDate: null,
      photoObjectPath: null,
      resumeObjectPath: null,
      resumeFileName: null,
      skills: null,
      experience: null,
      createdAt: null,
      updatedAt: null,
    });
    return;
  }
  res.json({
    id: profile.id,
    userId: profile.userId,
    userName: user?.name ?? null,
    bio: profile.bio,
    phone: profile.phone,
    address: profile.address,
    birthDate: profile.birthDate,
    photoObjectPath: profile.photoObjectPath,
    resumeObjectPath: profile.resumeObjectPath,
    resumeFileName: profile.resumeFileName,
    skills: profile.skills,
    experience: profile.experience,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  });
});

router.put("/profiles/:userId", requireAuth, async (req, res): Promise<void> => {
  const me = req.appUser!;
  const rawId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
  const userId = parseInt(rawId, 10);
  if (me.role === "BIDDER" && me.id !== userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { bio, phone, address, birthDate, photoObjectPath, resumeObjectPath, resumeFileName, skills, experience } = req.body as {
    bio?: string;
    phone?: string;
    address?: string;
    birthDate?: string;
    photoObjectPath?: string;
    resumeObjectPath?: string;
    resumeFileName?: string;
    skills?: string;
    experience?: string;
  };
  const updateData: Partial<{
    bio: string; phone: string; address: string; birthDate: string;
    photoObjectPath: string; resumeObjectPath: string; resumeFileName: string;
    skills: string; experience: string;
  }> = {};
  if (bio != null) updateData.bio = bio;
  if (phone != null) updateData.phone = phone;
  if (address != null) updateData.address = address;
  if (birthDate != null) updateData.birthDate = birthDate;
  if (photoObjectPath != null) updateData.photoObjectPath = photoObjectPath;
  if (resumeObjectPath != null) updateData.resumeObjectPath = resumeObjectPath;
  if (resumeFileName != null) updateData.resumeFileName = resumeFileName;
  if (skills != null) updateData.skills = skills;
  if (experience != null) updateData.experience = experience;

  const existing = await db.select().from(bidderProfilesTable).where(eq(bidderProfilesTable.userId, userId));
  let profile;
  if (existing.length > 0) {
    [profile] = await db.update(bidderProfilesTable).set(updateData).where(eq(bidderProfilesTable.userId, userId)).returning();
  } else {
    [profile] = await db.insert(bidderProfilesTable).values({ userId, ...updateData }).returning();
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  res.json({
    id: profile.id,
    userId: profile.userId,
    userName: user?.name ?? null,
    bio: profile.bio,
    phone: profile.phone,
    address: profile.address,
    birthDate: profile.birthDate,
    photoObjectPath: profile.photoObjectPath,
    resumeObjectPath: profile.resumeObjectPath,
    resumeFileName: profile.resumeFileName,
    skills: profile.skills,
    experience: profile.experience,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  });
});

export default router;
