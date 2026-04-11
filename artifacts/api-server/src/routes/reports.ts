import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, reportsTable, feedbackTable, usersTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/reports", requireAuth, async (req, res): Promise<void> => {
  const me = req.appUser!;
  const bidderId = req.query.bidderId ? parseInt(req.query.bidderId as string, 10) : undefined;
  const date = req.query.date as string | undefined;

  const reports = await db.select().from(reportsTable).orderBy(sql`${reportsTable.reportDate} DESC, ${reportsTable.createdAt} DESC`);
  const feedback = await db.select().from(feedbackTable);
  const users = await db.select().from(usersTable);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const feedbackCount = feedback.reduce((acc, f) => {
    acc[f.reportId] = (acc[f.reportId] ?? 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const filtered = reports.filter((r) => {
    if (me.role === "BIDDER") {
      if (r.bidderId !== me.id) return false;
    } else if (me.role === "BIDDER_MANAGER") {
      const bidder = userMap[r.bidderId];
      if (!bidder || bidder.managerId !== me.id) return false;
    }
    if (bidderId && r.bidderId !== bidderId) return false;
    if (date && r.reportDate !== date) return false;
    return true;
  });

  res.json(filtered.map((r) => ({
    id: r.id,
    bidderId: r.bidderId,
    bidderName: userMap[r.bidderId]?.name ?? null,
    reportDate: r.reportDate,
    projectsCount: r.projectsCount,
    projectsBid: r.projectsBid,
    outcomes: r.outcomes,
    notes: r.notes,
    createdAt: r.createdAt,
    feedbackCount: feedbackCount[r.id] ?? 0,
  })));
});

router.post("/reports", requireAuth, requireRole("BIDDER"), async (req, res): Promise<void> => {
  const me = req.appUser!;
  const { reportDate, projectsCount, projectsBid, outcomes, notes } = req.body;
  if (!reportDate || projectsCount == null || !projectsBid || !outcomes) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [report] = await db.insert(reportsTable).values({
    bidderId: me.id,
    reportDate,
    projectsCount: parseInt(projectsCount, 10),
    projectsBid,
    outcomes,
    notes: notes ?? null,
  }).returning();
  res.status(201).json({
    id: report.id,
    bidderId: report.bidderId,
    bidderName: me.name,
    reportDate: report.reportDate,
    projectsCount: report.projectsCount,
    projectsBid: report.projectsBid,
    outcomes: report.outcomes,
    notes: report.notes,
    createdAt: report.createdAt,
    feedbackCount: 0,
  });
});

router.get("/reports/:id", requireAuth, async (req, res): Promise<void> => {
  const me = req.appUser!;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, id));
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  if (me.role === "BIDDER") {
    if (report.bidderId !== me.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  } else if (me.role === "BIDDER_MANAGER") {
    const [bidder] = await db.select().from(usersTable).where(eq(usersTable.id, report.bidderId));
    if (!bidder || bidder.managerId !== me.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const users = await db.select().from(usersTable);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  const feedback = await db.select().from(feedbackTable).where(eq(feedbackTable.reportId, id));
  res.json({
    id: report.id,
    bidderId: report.bidderId,
    bidderName: userMap[report.bidderId]?.name ?? null,
    reportDate: report.reportDate,
    projectsCount: report.projectsCount,
    projectsBid: report.projectsBid,
    outcomes: report.outcomes,
    notes: report.notes,
    createdAt: report.createdAt,
    feedbackCount: feedback.length,
  });
});

router.get("/reports/:reportId/feedback", requireAuth, async (req, res): Promise<void> => {
  const me = req.appUser!;
  const rawId = Array.isArray(req.params.reportId) ? req.params.reportId[0] : req.params.reportId;
  const reportId = parseInt(rawId, 10);

  const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, reportId));
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  if (me.role === "BIDDER") {
    if (report.bidderId !== me.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  } else if (me.role === "BIDDER_MANAGER") {
    const [bidder] = await db.select().from(usersTable).where(eq(usersTable.id, report.bidderId));
    if (!bidder || bidder.managerId !== me.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const feedback = await db.select().from(feedbackTable).where(eq(feedbackTable.reportId, reportId)).orderBy(feedbackTable.createdAt);
  const users = await db.select().from(usersTable);
  const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
  res.json(feedback.map((f) => ({
    id: f.id,
    reportId: f.reportId,
    authorId: f.authorId,
    authorName: userMap[f.authorId]?.name ?? null,
    authorRole: userMap[f.authorId]?.role ?? null,
    content: f.content,
    createdAt: f.createdAt,
  })));
});

router.post("/reports/:reportId/feedback", requireAuth, requireRole("CHIEF_ADMIN", "BIDDER_MANAGER"), async (req, res): Promise<void> => {
  const me = req.appUser!;
  const rawId = Array.isArray(req.params.reportId) ? req.params.reportId[0] : req.params.reportId;
  const reportId = parseInt(rawId, 10);

  const [report] = await db.select().from(reportsTable).where(eq(reportsTable.id, reportId));
  if (!report) {
    res.status(404).json({ error: "Report not found" });
    return;
  }

  if (me.role === "BIDDER_MANAGER") {
    const [bidder] = await db.select().from(usersTable).where(eq(usersTable.id, report.bidderId));
    if (!bidder || bidder.managerId !== me.id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const { content } = req.body;
  if (!content) {
    res.status(400).json({ error: "Content is required" });
    return;
  }
  const [fb] = await db.insert(feedbackTable).values({ reportId, authorId: me.id, content }).returning();
  res.status(201).json({
    id: fb.id,
    reportId: fb.reportId,
    authorId: fb.authorId,
    authorName: me.name,
    authorRole: me.role,
    content: fb.content,
    createdAt: fb.createdAt,
  });
});

export default router;
