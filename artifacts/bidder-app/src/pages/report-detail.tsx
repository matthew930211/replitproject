import { useParams, Link } from "wouter";
import { useGetReport, getGetReportQueryKey, useListFeedback, getListFeedbackQueryKey, useCreateFeedback, useGetMe } from "@workspace/api-client-react";
import { UserRole } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function ReportDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useGetMe();
  
  const { data: report, isLoading: isReportLoading } = useGetReport(id, {
    query: { enabled: !!id, queryKey: getGetReportQueryKey(id) }
  });

  const { data: feedbacks, isLoading: isFeedbackLoading } = useListFeedback(id, {
    query: { enabled: !!id, queryKey: getListFeedbackQueryKey(id) }
  });

  const createFeedback = useCreateFeedback();
  const [feedbackContent, setFeedbackContent] = useState("");

  const handleSendFeedback = () => {
    if (!feedbackContent.trim()) return;
    createFeedback.mutate(
      { reportId: id, data: { content: feedbackContent } },
      {
        onSuccess: () => {
          setFeedbackContent("");
          queryClient.invalidateQueries({ queryKey: getListFeedbackQueryKey(id) });
          queryClient.invalidateQueries({ queryKey: getGetReportQueryKey(id) });
          toast({ title: "Feedback posted" });
        },
        onError: () => {
          toast({ title: "Failed to post feedback", variant: "destructive" });
        }
      }
    );
  };

  if (isReportLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card><CardContent className="h-64 pt-6"><Skeleton className="h-full w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!report) {
    return <div>Report not found</div>;
  }

  const canFeedback = user?.role === UserRole.CHIEF_ADMIN || user?.role === UserRole.BIDDER_MANAGER;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/reports"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Report for {new Date(report.reportDate).toLocaleDateString()}</h1>
          <p className="text-muted-foreground text-sm">By {report.bidderName || `Bidder #${report.bidderId}`}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Activity Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Projects Bid ({report.projectsCount})</h3>
                <div className="p-3 bg-muted/30 rounded-md whitespace-pre-wrap text-sm">
                  {report.projectsBid}
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Outcomes & Results</h3>
                <div className="p-3 bg-muted/30 rounded-md whitespace-pre-wrap text-sm">
                  {report.outcomes}
                </div>
              </div>

              {report.notes && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-1">Additional Notes</h3>
                  <div className="p-3 bg-muted/30 rounded-md whitespace-pre-wrap text-sm">
                    {report.notes}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-lg">Feedback Thread</CardTitle>
              <CardDescription>{feedbacks?.length || 0} comments</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[500px]">
              {isFeedbackLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : feedbacks?.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No feedback yet.
                </div>
              ) : (
                feedbacks?.map((fb) => (
                  <div key={fb.id} className="flex gap-3 bg-muted/20 p-3 rounded-lg">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {fb.authorName?.charAt(0).toUpperCase() || <UserIcon className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{fb.authorName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(fb.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 mb-1 h-4">{fb.authorRole?.replace('_', ' ')}</Badge>
                      <p className="text-sm">{fb.content}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
            
            {canFeedback && (
              <div className="p-4 border-t bg-muted/10">
                <div className="flex gap-2">
                  <Textarea 
                    placeholder="Write feedback..."
                    value={feedbackContent}
                    onChange={(e) => setFeedbackContent(e.target.value)}
                    className="min-h-[80px] resize-none"
                    data-testid="textarea-feedback"
                  />
                </div>
                <div className="flex justify-end mt-2">
                  <Button size="sm" onClick={handleSendFeedback} disabled={!feedbackContent.trim()} data-testid="btn-send-feedback">
                    <Send className="h-4 w-4 mr-2" /> Post
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
