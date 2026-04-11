import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, bidderProfilesTable, profileResumesTable, profileAccessTable, usersTable, objectUploadsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

function profileShape(p: typeof bidderProfilesTable.$inferSelect) {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    linkedin: p.linkedin,
    github: p.github,
    phone: p.phone,
    address: p.address,
    birthDate: p.birthDate,
    photoObjectPath: p.photoObjectPath,
    bio: p.bio,
    skills: p.skills,
    experience: p.experience,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

function resumeShape(r: typeof profileResumesTable.$inferSelect) {
  return {
    id: r.id,
    profileId: r.profileId,
    label: r.label,
    resumeObjectPath: r.resumeObjectPath,
    resumeFileName: r.resumeFileName,
    createdAt: r.createdAt,
  };
}

function accessShape(a: typeof profileAccessTable.$inferSelect, bidderName: string | null) {
  return {
    id: a.id,
    profileId: a.profileId,
    bidderId: a.bidderId,
    bidderName,
    createdAt: a.createdAt,
  };
}

router.get("/profiles", requireAuth, async (req, res): Promise<void> => {
  const me = req.appUser!;

  if (me.role === "BIDDER") {
    const accessRows = await db.select().from(profileAccessTable).where(eq(profileAccessTable.bidderId, me.id));
    const profileIds = accessRows.map((a) => a.profileId);
    if (profileIds.length === 0) { res.json([]); return; }
    const profiles = await db.select().from(bidderProfilesTable).where(inArray(bidderProfilesTable.id, profileIds));
    const resumes = await db.select().from(profileResumesTable).where(inArray(profileResumesTable.profileId, profileIds));
    const resumesByProfile: Record<number, typeof resumes> = {};
    for (const r of resumes) {
      if (!resumesByProfile[r.profileId]) resumesByProfile[r.profileId] = [];
      resumesByProfile[r.profileId].push(r);
    }
    res.json(profiles.map((p) => ({
      ...profileShape(p),
      resumes: (resumesByProfile[p.id] || []).map(resumeShape),
      accessGrants: [],
    })));
    return;
  }

  if (me.role === "BIDDER_MANAGER") {
    const myBidders = await db.select().from(usersTable).where(eq(usersTable.managerId, me.id));
    const myBidderIds = myBidders.map((u) => u.id);
    if (myBidderIds.length === 0) { res.json([]); return; }
    const accessRows = await db.select().from(profileAccessTable).where(inArray(profileAccessTable.bidderId, myBidderIds));
    const profileIds = [...new Set(accessRows.map((a) => a.profileId))];
    if (profileIds.length === 0) { res.json([]); return; }
    const profiles = await db.select().from(bidderProfilesTable).where(inArray(bidderProfilesTable.id, profileIds));
    const resumes = await db.select().from(profileResumesTable).where(inArray(profileResumesTable.profileId, profileIds));
    const allAccessRows = await db.select().from(profileAccessTable).where(inArray(profileAccessTable.profileId, profileIds));
    const allBidderIds = [...new Set(allAccessRows.map((a) => a.bidderId))];
    const bidderUsers = allBidderIds.length > 0 ? await db.select().from(usersTable).where(inArray(usersTable.id, allBidderIds)) : [];
    const bidderMap = Object.fromEntries(bidderUsers.map((u) => [u.id, u]));
    const resumesByProfile: Record<number, typeof resumes> = {};
    for (const r of resumes) {
      if (!resumesByProfile[r.profileId]) resumesByProfile[r.profileId] = [];
      resumesByProfile[r.profileId].push(r);
    }
    const accessByProfile: Record<number, typeof allAccessRows> = {};
    for (const a of allAccessRows) {
      if (!accessByProfile[a.profileId]) accessByProfile[a.profileId] = [];
      accessByProfile[a.profileId].push(a);
    }
    res.json(profiles.map((p) => ({
      ...profileShape(p),
      resumes: (resumesByProfile[p.id] || []).map(resumeShape),
      accessGrants: (accessByProfile[p.id] || []).map((a) => accessShape(a, bidderMap[a.bidderId]?.name ?? null)),
    })));
    return;
  }

  const profiles = await db.select().from(bidderProfilesTable);
  const profileIds = profiles.map((p) => p.id);
  const resumes = profileIds.length > 0 ? await db.select().from(profileResumesTable).where(inArray(profileResumesTable.profileId, profileIds)) : [];
  const allAccessRows = profileIds.length > 0 ? await db.select().from(profileAccessTable).where(inArray(profileAccessTable.profileId, profileIds)) : [];
  const allBidderIds = [...new Set(allAccessRows.map((a) => a.bidderId))];
  const bidderUsers = allBidderIds.length > 0 ? await db.select().from(usersTable).where(inArray(usersTable.id, allBidderIds)) : [];
  const bidderMap = Object.fromEntries(bidderUsers.map((u) => [u.id, u]));
  const resumesByProfile: Record<number, typeof resumes> = {};
  for (const r of resumes) {
    if (!resumesByProfile[r.profileId]) resumesByProfile[r.profileId] = [];
    resumesByProfile[r.profileId].push(r);
  }
  const accessByProfile: Record<number, typeof allAccessRows> = {};
  for (const a of allAccessRows) {
    if (!accessByProfile[a.profileId]) accessByProfile[a.profileId] = [];
    accessByProfile[a.profileId].push(a);
  }
  res.json(profiles.map((p) => ({
    ...profileShape(p),
    resumes: (resumesByProfile[p.id] || []).map(resumeShape),
    accessGrants: (accessByProfile[p.id] || []).map((a) => accessShape(a, bidderMap[a.bidderId]?.name ?? null)),
  })));
});

router.post("/profiles", requireAuth, requireRole("CHIEF_ADMIN"), async (req, res): Promise<void> => {
  const { firstName, lastName, email, linkedin, github, phone, address, birthDate, photoObjectPath, bio, skills, experience } = req.body as {
    firstName: string;
    lastName: string;
    email?: string;
    linkedin?: string;
    github?: string;
    phone?: string;
    address?: string;
    birthDate?: string;
    photoObjectPath?: string;
    bio?: string;
    skills?: string;
    experience?: string;
  };

  if (!firstName || firstName.trim() === "") {
    res.status(400).json({ error: "firstName is required" });
    return;
  }
  if (!lastName || lastName.trim() === "") {
    res.status(400).json({ error: "lastName is required" });
    return;
  }

  const [profile] = await db.insert(bidderProfilesTable).values({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: email ?? null,
    linkedin: linkedin ?? null,
    github: github ?? null,
    phone: phone ?? null,
    address: address ?? null,
    birthDate: birthDate ?? null,
    photoObjectPath: photoObjectPath ?? null,
    bio: bio ?? null,
    skills: skills ?? null,
    experience: experience ?? null,
  }).returning();

  res.status(201).json({
    ...profileShape(profile),
    resumes: [],
    accessGrants: [],
  });
});

router.get("/profiles/:profileId", requireAuth, async (req, res): Promise<void> => {
  const me = req.appUser!;
  const rawId = Array.isArray(req.params.profileId) ? req.params.profileId[0] : req.params.profileId;
  const profileId = parseInt(rawId, 10);

  const [profile] = await db.select().from(bidderProfilesTable).where(eq(bidderProfilesTable.id, profileId));
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  if (me.role === "BIDDER") {
    const [access] = await db.select().from(profileAccessTable).where(
      and(eq(profileAccessTable.profileId, profileId), eq(profileAccessTable.bidderId, me.id))
    );
    if (!access) { res.status(403).json({ error: "Forbidden" }); return; }
  } else if (me.role === "BIDDER_MANAGER") {
    const myBidders = await db.select().from(usersTable).where(eq(usersTable.managerId, me.id));
    const myBidderIds = myBidders.map((u) => u.id);
    const accessRows = myBidderIds.length > 0
      ? await db.select().from(profileAccessTable).where(
          and(eq(profileAccessTable.profileId, profileId), inArray(profileAccessTable.bidderId, myBidderIds))
        )
      : [];
    if (accessRows.length === 0) { res.status(403).json({ error: "Forbidden" }); return; }
  }

  const resumes = await db.select().from(profileResumesTable).where(eq(profileResumesTable.profileId, profileId));
  const accessGrants = await db.select().from(profileAccessTable).where(eq(profileAccessTable.profileId, profileId));
  const bidderIds = accessGrants.map((a) => a.bidderId);
  const bidderUsers = bidderIds.length > 0 ? await db.select().from(usersTable).where(inArray(usersTable.id, bidderIds)) : [];
  const bidderMap = Object.fromEntries(bidderUsers.map((u) => [u.id, u]));

  res.json({
    ...profileShape(profile),
    resumes: resumes.map(resumeShape),
    accessGrants: accessGrants.map((a) => accessShape(a, bidderMap[a.bidderId]?.name ?? null)),
  });
});

router.put("/profiles/:profileId", requireAuth, requireRole("CHIEF_ADMIN"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.profileId) ? req.params.profileId[0] : req.params.profileId;
  const profileId = parseInt(rawId, 10);

  const [existing] = await db.select().from(bidderProfilesTable).where(eq(bidderProfilesTable.id, profileId));
  if (!existing) { res.status(404).json({ error: "Profile not found" }); return; }

  const { firstName, lastName, email, linkedin, github, phone, address, birthDate, photoObjectPath, bio, skills, experience } = req.body as {
    firstName?: string;
    lastName?: string;
    email?: string;
    linkedin?: string;
    github?: string;
    phone?: string;
    address?: string;
    birthDate?: string;
    photoObjectPath?: string;
    bio?: string;
    skills?: string;
    experience?: string;
  };

  const updateData: Partial<typeof bidderProfilesTable.$inferInsert> = {};
  if (firstName != null) updateData.firstName = firstName;
  if (lastName != null) updateData.lastName = lastName;
  if (email != null) updateData.email = email;
  if (linkedin != null) updateData.linkedin = linkedin;
  if (github != null) updateData.github = github;
  if (phone != null) updateData.phone = phone;
  if (address != null) updateData.address = address;
  if (birthDate != null) updateData.birthDate = birthDate;
  if (photoObjectPath != null) updateData.photoObjectPath = photoObjectPath;
  if (bio != null) updateData.bio = bio;
  if (skills != null) updateData.skills = skills;
  if (experience != null) updateData.experience = experience;

  const [profile] = await db.update(bidderProfilesTable).set(updateData).where(eq(bidderProfilesTable.id, profileId)).returning();

  const resumes = await db.select().from(profileResumesTable).where(eq(profileResumesTable.profileId, profileId));
  const accessGrants = await db.select().from(profileAccessTable).where(eq(profileAccessTable.profileId, profileId));
  const bidderIds = accessGrants.map((a) => a.bidderId);
  const bidderUsers = bidderIds.length > 0 ? await db.select().from(usersTable).where(inArray(usersTable.id, bidderIds)) : [];
  const bidderMap = Object.fromEntries(bidderUsers.map((u) => [u.id, u]));

  res.json({
    ...profileShape(profile),
    resumes: resumes.map(resumeShape),
    accessGrants: accessGrants.map((a) => accessShape(a, bidderMap[a.bidderId]?.name ?? null)),
  });
});

router.delete("/profiles/:profileId", requireAuth, requireRole("CHIEF_ADMIN"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.profileId) ? req.params.profileId[0] : req.params.profileId;
  const profileId = parseInt(rawId, 10);

  const [existing] = await db.select().from(bidderProfilesTable).where(eq(bidderProfilesTable.id, profileId));
  if (!existing) { res.status(404).json({ error: "Profile not found" }); return; }

  await db.delete(bidderProfilesTable).where(eq(bidderProfilesTable.id, profileId));
  res.json({ ok: true });
});

router.post("/profiles/:profileId/resumes", requireAuth, requireRole("CHIEF_ADMIN"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.profileId) ? req.params.profileId[0] : req.params.profileId;
  const profileId = parseInt(rawId, 10);

  const [profile] = await db.select().from(bidderProfilesTable).where(eq(bidderProfilesTable.id, profileId));
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  const { label, resumeObjectPath, resumeFileName } = req.body as {
    label?: string;
    resumeObjectPath: string;
    resumeFileName?: string;
  };

  if (!resumeObjectPath) { res.status(400).json({ error: "resumeObjectPath is required" }); return; }

  const [upload] = await db.select().from(objectUploadsTable).where(eq(objectUploadsTable.objectPath, resumeObjectPath));
  if (!upload) { res.status(400).json({ error: "Invalid object path — not found in uploads" }); return; }

  const [resume] = await db.insert(profileResumesTable).values({
    profileId,
    label: label ?? null,
    resumeObjectPath,
    resumeFileName: resumeFileName ?? null,
  }).returning();

  res.status(201).json(resumeShape(resume));
});

router.delete("/profiles/:profileId/resumes/:resumeId", requireAuth, requireRole("CHIEF_ADMIN"), async (req, res): Promise<void> => {
  const profileId = parseInt(req.params.profileId, 10);
  const resumeId = parseInt(req.params.resumeId, 10);

  const [resume] = await db.select().from(profileResumesTable).where(
    and(eq(profileResumesTable.id, resumeId), eq(profileResumesTable.profileId, profileId))
  );
  if (!resume) { res.status(404).json({ error: "Resume not found" }); return; }

  await db.delete(profileResumesTable).where(eq(profileResumesTable.id, resumeId));
  res.json({ ok: true });
});

router.post("/profiles/:profileId/access", requireAuth, requireRole("CHIEF_ADMIN", "BIDDER_MANAGER"), async (req, res): Promise<void> => {
  const me = req.appUser!;
  const profileId = parseInt(req.params.profileId, 10);
  const { bidderId } = req.body as { bidderId: number };

  if (!bidderId) { res.status(400).json({ error: "bidderId is required" }); return; }

  const [profile] = await db.select().from(bidderProfilesTable).where(eq(bidderProfilesTable.id, profileId));
  if (!profile) { res.status(404).json({ error: "Profile not found" }); return; }

  const [bidder] = await db.select().from(usersTable).where(eq(usersTable.id, bidderId));
  if (!bidder || bidder.role !== "BIDDER") { res.status(400).json({ error: "Target user must be a BIDDER" }); return; }

  if (me.role === "BIDDER_MANAGER" && bidder.managerId !== me.id) {
    res.status(403).json({ error: "Forbidden: bidder is not assigned to you" });
    return;
  }

  const [existing] = await db.select().from(profileAccessTable).where(
    and(eq(profileAccessTable.profileId, profileId), eq(profileAccessTable.bidderId, bidderId))
  );
  if (existing) {
    res.json(accessShape(existing, bidder.name));
    return;
  }

  const [access] = await db.insert(profileAccessTable).values({ profileId, bidderId }).returning();
  res.status(201).json(accessShape(access, bidder.name));
});

router.delete("/profiles/:profileId/access/:bidderId", requireAuth, requireRole("CHIEF_ADMIN", "BIDDER_MANAGER"), async (req, res): Promise<void> => {
  const me = req.appUser!;
  const profileId = parseInt(req.params.profileId, 10);
  const bidderId = parseInt(req.params.bidderId, 10);

  const [bidder] = await db.select().from(usersTable).where(eq(usersTable.id, bidderId));
  if (me.role === "BIDDER_MANAGER" && (!bidder || bidder.managerId !== me.id)) {
    res.status(403).json({ error: "Forbidden: bidder is not assigned to you" });
    return;
  }

  const [access] = await db.select().from(profileAccessTable).where(
    and(eq(profileAccessTable.profileId, profileId), eq(profileAccessTable.bidderId, bidderId))
  );
  if (!access) { res.status(404).json({ error: "Access grant not found" }); return; }

  await db.delete(profileAccessTable).where(eq(profileAccessTable.id, access.id));
  res.json({ ok: true });
});

export default router;
