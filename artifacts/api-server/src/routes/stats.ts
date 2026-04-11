import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, usersTable, reportsTable, messagesTable, presenceTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const ONLINE_THRESHOLD_MINUTES = 3;

router.get("/stats/dashboard", requireAuth, async (req, res): Promise<void> => {
  const me = req.appUser!;
  const today = new Date().toISOString().split("T")[0];
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartStr = weekStart.toISOString().split("T")[0];
  const threshold = new Date(Date.now() - ONLINE_THRESHOLD_MINUTES * 60 * 1000);

  const [users, reports, messages, online] = await Promise.all([
    db.select().from(usersTable),
    db.select().from(reportsTable),
    db.select().from(messagesTable),
    db.select().from(presenceTable).where(sql`${presenceTable.lastSeenAt} > ${threshold}`),
  ]);

  let scopedBidders: typeof users;
  let scopedReports: typeof reports;

  if (me.role === "BIDDER") {
    scopedBidders = users.filter((u) => u.id === me.id);
    scopedReports = reports.filter((r) => r.bidderId === me.id);
  } else if (me.role === "BIDDER_MANAGER") {
    scopedBidders = users.filter((u) => u.role === "BIDDER" && u.managerId === me.id);
    const bidderIds = new Set(scopedBidders.map((b) => b.id));
    scopedReports = reports.filter((r) => bidderIds.has(r.bidderId));
  } else {
    scopedBidders = users.filter((u) => u.role === "BIDDER");
    scopedReports = reports;
  }

  const totalBidders = me.role === "BIDDER" ? undefined : scopedBidders.length;
  const totalManagers = me.role === "CHIEF_ADMIN" ? users.filter((u) => u.role === "BIDDER_MANAGER").length : undefined;
  const reportsToday = scopedReports.filter((r) => r.reportDate === today).length;
  const reportsThisWeek = scopedReports.filter((r) => r.reportDate >= weekStartStr).length;

  res.json({
    totalUsers: me.role === "CHIEF_ADMIN" ? users.length : undefined,
    totalBidders,
    totalManagers,
    reportsToday,
    reportsThisWeek,
    onlineNow: online.length,
    totalReports: scopedReports.length,
    totalMessages: me.role === "CHIEF_ADMIN" ? messages.length : undefined,
  });
});

router.get("/stats/reports-summary", requireAuth, async (req, res): Promise<void> => {
  const me = req.appUser!;
  const users = await db.select().from(usersTable);
  const reports = await db.select().from(reportsTable);

  const bidders = users.filter((u) => {
    if (u.role !== "BIDDER") return false;
    if (me.role === "BIDDER") return u.id === me.id;
    if (me.role === "BIDDER_MANAGER") return u.managerId === me.id;
    return true;
  });

  const summary = bidders.map((b) => {
    const bidderReports = reports.filter((r) => r.bidderId === b.id);
    const totalProjects = bidderReports.reduce((sum, r) => sum + r.projectsCount, 0);
    const lastReport = bidderReports.sort((a, b) => b.reportDate.localeCompare(a.reportDate))[0];
    return {
      bidderId: b.id,
      bidderName: b.name,
      totalReports: bidderReports.length,
      totalProjects,
      lastReportDate: lastReport?.reportDate ?? null,
    };
  });

  res.json(summary);
});

export default router;
