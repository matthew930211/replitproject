import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateReport } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

const reportSchema = z.object({
  reportDate: z.string(),
  projectsCount: z.coerce.number().min(0),
  projectsBid: z.string().min(1, "Required"),
  outcomes: z.string().min(1, "Required"),
  notes: z.string().optional(),
});

export default function NewReport() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createReport = useCreateReport();

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportDate: format(new Date(), "yyyy-MM-dd"),
      projectsCount: 0,
      projectsBid: "",
      outcomes: "",
      notes: "",
    },
  });

  function onSubmit(values: z.infer<typeof reportSchema>) {
    createReport.mutate({ data: values }, {
      onSuccess: (data) => {
        toast({
          title: "Report submitted",
          description: "Your daily report has been saved successfully.",
        });
        setLocation(`/reports/${data.id}`);
      },
      onError: (err) => {
        toast({
          title: "Error",
          description: "Failed to submit report. Please try again.",
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">New Daily Report</h1>
        <Button variant="outline" onClick={() => setLocation("/reports")} data-testid="btn-cancel-report">
          Cancel
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Details</CardTitle>
          <CardDescription>Summarize your bidding activity for the day.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reportDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-report-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="projectsCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Projects Bid Count</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} data-testid="input-projects-count" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="projectsBid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projects Bid Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="List the projects you bid on today..." 
                        className="min-h-[100px]" 
                        {...field} 
                        data-testid="textarea-projects-bid"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outcomes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Outcomes & Results</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Did you win? Lose? Waiting on response?" 
                        className="min-h-[100px]" 
                        {...field} 
                        data-testid="textarea-outcomes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any blockers or things management should know?" 
                        className="min-h-[80px]" 
                        {...field} 
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-6 mt-2">
              <Button type="submit" disabled={createReport.isPending} data-testid="btn-submit-report">
                {createReport.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Report
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
