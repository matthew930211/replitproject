import { useGetMe, useGetDashboardStats, useGetReportsSummary } from "@workspace/api-client-react";
import { UserRole } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Users, FileText, Activity, MessagesSquare } from "lucide-react";

export default function Dashboard() {
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const { data: stats, isLoading: isStatsLoading } = useGetDashboardStats();
  const { data: summaries, isLoading: isSummaryLoading } = useGetReportsSummary();

  if (isUserLoading || isStatsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const role = user?.role;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.name}</h1>
        {role === UserRole.BIDDER && (
          <Button asChild data-testid="btn-new-report-dash">
            <Link href="/reports/new">Submit Daily Report</Link>
          </Button>
        )}
      </div>

      {(role === UserRole.CHIEF_ADMIN || role === UserRole.BIDDER_MANAGER) && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bidders</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalBidders || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reports Today</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.reportsToday || 0}</div>
              <p className="text-xs text-muted-foreground">
                Out of {stats?.reportsThisWeek || 0} this week
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Online Now</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.onlineNow || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessagesSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {(role === UserRole.CHIEF_ADMIN || role === UserRole.BIDDER_MANAGER) && (
        <Card>
          <CardHeader>
            <CardTitle>Team Overview</CardTitle>
            <CardDescription>Summary of bidder performance.</CardDescription>
          </CardHeader>
          <CardContent>
            {isSummaryLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <div className="rounded-md border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Bidder</th>
                      <th className="px-4 py-3 font-medium">Total Reports</th>
                      <th className="px-4 py-3 font-medium">Total Projects</th>
                      <th className="px-4 py-3 font-medium">Last Report</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summaries?.map((s) => (
                      <tr key={s.bidderId} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium">{s.bidderName}</td>
                        <td className="px-4 py-3">{s.totalReports}</td>
                        <td className="px-4 py-3">{s.totalProjects}</td>
                        <td className="px-4 py-3">{s.lastReportDate ? new Date(s.lastReportDate).toLocaleDateString() : 'Never'}</td>
                      </tr>
                    ))}
                    {(!summaries || summaries.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          No reports found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {role === UserRole.BIDDER && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>My Stats</CardTitle>
              <CardDescription>Your recent activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">Total Reports Submitted</span>
                  <span className="text-xl font-bold">{summaries?.find(s => s.bidderId === user.id)?.totalReports || 0}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <span className="font-medium">Projects Bid</span>
                  <span className="text-xl font-bold">{summaries?.find(s => s.bidderId === user.id)?.totalProjects || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
