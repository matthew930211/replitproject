import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, jobsTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

function formatJob(j: typeof jobsTable.$inferSelect, creatorName?: string | null) {
  return {
    id: j.id,
    date: j.date,
    companyName: j.companyName,
    jobTitle: j.jobTitle,
    detailLink: j.detailLink,
    requiredSkills: j.requiredSkills,
    employmentType: j.employmentType,
    status: j.status,
    evaluationStatus: j.evaluationStatus,
    evaluationComments: j.evaluationComments,
    createdById: j.createdById,
    createdByName: creatorName ?? null,
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  };
}

router.get("/jobs", requireAuth, async (req, res): Promise<void> => {
  const me = req.appUser!;
  const isBidder = me.role === "BIDDER";

  let jobRows;
  if (isBidder) {
    jobRows = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.createdById, me.id))
      .orderBy(desc(jobsTable.date));
  } else {
    jobRows = await db.select().from(jobsTable).orderBy(desc(jobsTable.date));
  }

  const users = await db.select().from(usersTable);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  res.json(jobRows.map((j) => formatJob(j, userMap[j.createdById ?? -1]?.name)));
});

router.get("/jobs/:id", requireAuth, async (req, res): Promise<void> => {
  const me = req.appUser!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  if (me.role === "BIDDER" && job.createdById !== me.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const creator = job.createdById
    ? (await db.select().from(usersTable).where(eq(usersTable.id, job.createdById)))[0]
    : null;
  res.json(formatJob(job, creator?.name));
});

router.post("/jobs", requireAuth, async (req, res): Promise<void> => {
  const me = req.appUser!;
  const { date, companyName, jobTitle, detailLink, requiredSkills, employmentType, status, evaluationStatus, evaluationComments } = req.body;
  if (!companyName || !jobTitle) {
    res.status(400).json({ error: "companyName and jobTitle are required" });
    return;
  }
  const [job] = await db.insert(jobsTable).values({
    date: date ? new Date(date) : new Date(),
    companyName,
    jobTitle,
    detailLink: detailLink || null,
    requiredSkills: requiredSkills || null,
    employmentType: employmentType || "REMOTE",
    status: status || "NEW",
    evaluationStatus: evaluationStatus || "PENDING",
    evaluationComments: evaluationComments || null,
    createdById: me.id,
  }).returning();
  res.status(201).json(formatJob(job, me.name));
});

router.put("/jobs/:id", requireAuth, async (req, res): Promise<void> => {
  const me = req.appUser!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [existing] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  if (me.role === "BIDDER" && existing.createdById !== me.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const { date, companyName, jobTitle, detailLink, requiredSkills, employmentType, status, evaluationStatus, evaluationComments } = req.body;
  const updateData: Record<string, unknown> = {};
  if (date !== undefined) updateData.date = new Date(date);
  if (companyName !== undefined) updateData.companyName = companyName;
  if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
  if (detailLink !== undefined) updateData.detailLink = detailLink || null;
  if (requiredSkills !== undefined) updateData.requiredSkills = requiredSkills || null;
  if (employmentType !== undefined) updateData.employmentType = employmentType;
  if (status !== undefined) updateData.status = status;
  if (evaluationStatus !== undefined) updateData.evaluationStatus = evaluationStatus;
  if (evaluationComments !== undefined) updateData.evaluationComments = evaluationComments || null;

  const [job] = await db.update(jobsTable).set(updateData).where(eq(jobsTable.id, id)).returning();
  const creator = job.createdById
    ? (await db.select().from(usersTable).where(eq(usersTable.id, job.createdById)))[0]
    : null;
  res.json(formatJob(job, creator?.name));
});

router.delete("/jobs/:id", requireAuth, requireRole("CHIEF_ADMIN"), async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const [job] = await db.select().from(jobsTable).where(eq(jobsTable.id, id));
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  await db.delete(jobsTable).where(eq(jobsTable.id, id));
  res.json({ ok: true });
});

export default router;
