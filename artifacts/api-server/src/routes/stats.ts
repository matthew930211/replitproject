import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, usersTable, reportsTable, messagesTable, presenceTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const ONLINE_THRESHOLD_MINUTES = 3;

router.get("/stats/dashboard", requireAuth, async (req, res): Promise<void> => {
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

  const totalBidders = users.filter((u) => u.role === "BIDDER").length;
  const totalManagers = users.filter((u) => u.role === "BIDDER_MANAGER").length;
  const reportsToday = reports.filter((r) => r.reportDate === today).length;
  const reportsThisWeek = reports.filter((r) => r.reportDate >= weekStartStr).length;

  res.json({
    totalUsers: users.length,
    totalBidders,
    totalManagers,
    reportsToday,
    reportsThisWeek,
    onlineNow: online.length,
    totalReports: reports.length,
    totalMessages: messages.length,
  });
});

router.get("/stats/reports-summary", requireAuth, async (req, res): Promise<void> => {
  const me = (req as any).appUser;
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
