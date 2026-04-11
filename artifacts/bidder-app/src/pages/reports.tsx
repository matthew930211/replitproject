import { useGetMe, useListReports } from "@workspace/api-client-react";
import { UserRole } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { PlusCircle, Search, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function Reports() {
  const { data: user } = useGetMe();
  const [search, setSearch] = useState("");
  
  const { data: reports, isLoading } = useListReports({
    // Only pass bidderId if it's a bidder, to fetch own. Actually backend does this automatically based on role for bidders.
  });

  const filteredReports = reports?.filter(r => 
    (r.bidderName?.toLowerCase().includes(search.toLowerCase()) || 
     r.projectsBid.toLowerCase().includes(search.toLowerCase()) ||
     r.outcomes.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        {user?.role === UserRole.BIDDER && (
          <Button asChild data-testid="btn-new-report">
            <Link href="/reports/new"><PlusCircle className="mr-2 h-4 w-4"/> New Report</Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search reports..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-reports"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Bidder</th>
                    <th className="px-4 py-3 font-medium">Projects</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">Outcomes</th>
                    <th className="px-4 py-3 font-medium text-right">Feedback</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredReports?.map((report) => (
                    <tr 
                      key={report.id} 
                      className="hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => window.location.assign(`${import.meta.env.BASE_URL}reports/${report.id}`)}
                      data-testid={`row-report-${report.id}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">{new Date(report.reportDate).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium">{report.bidderName || `Bidder #${report.bidderId}`}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary" className="mr-2">{report.projectsCount}</Badge>
                        <span className="hidden sm:inline truncate max-w-[150px]">{report.projectsBid}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell truncate max-w-[200px] text-muted-foreground">{report.outcomes}</td>
                      <td className="px-4 py-3 text-right">
                        {report.feedbackCount > 0 ? (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                            <MessageSquare className="mr-1 h-3 w-3" /> {report.feedbackCount}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!filteredReports || filteredReports.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No reports found matching your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
