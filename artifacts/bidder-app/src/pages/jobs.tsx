import { useState } from "react";
import { useGetMe, useListJobs, useCreateJob, useUpdateJob, useDeleteJob } from "@workspace/api-client-react";
import { UserRole } from "@workspace/api-client-react";
import type { Job, CreateJobBody, UpdateJobBody } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListJobsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search,
  PlusCircle,
  Pencil,
  Trash2,
  ExternalLink,
  Briefcase,
} from "lucide-react";

const EMPLOYMENT_TYPES = ["ONSITE", "HYBRID", "REMOTE"] as const;
const JOB_STATUSES = ["NEW", "APPLIED", "SCHEDULED", "INTERVIEWING", "OFFERED", "REJECTED", "WITHDRAWN"] as const;
const EVAL_STATUSES = ["PENDING", "PERFECT", "GOOD", "AVERAGE", "BAD"] as const;

function statusColor(s: string) {
  switch (s) {
    case "NEW": return "bg-blue-100 text-blue-800";
    case "APPLIED": return "bg-yellow-100 text-yellow-800";
    case "SCHEDULED": return "bg-purple-100 text-purple-800";
    case "INTERVIEWING": return "bg-indigo-100 text-indigo-800";
    case "OFFERED": return "bg-green-100 text-green-800";
    case "REJECTED": return "bg-red-100 text-red-800";
    case "WITHDRAWN": return "bg-gray-100 text-gray-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function evalColor(s: string) {
  switch (s) {
    case "PERFECT": return "bg-green-100 text-green-800";
    case "GOOD": return "bg-emerald-100 text-emerald-800";
    case "AVERAGE": return "bg-yellow-100 text-yellow-800";
    case "BAD": return "bg-red-100 text-red-800";
    case "PENDING": return "bg-gray-100 text-gray-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function empTypeLabel(t: string) {
  switch (t) {
    case "ONSITE": return "Onsite";
    case "HYBRID": return "Hybrid";
    case "REMOTE": return "Remote";
    default: return t;
  }
}

interface JobFormData {
  date: string;
  companyName: string;
  jobTitle: string;
  detailLink: string;
  requiredSkills: string;
  employmentType: string;
  status: string;
  evaluationStatus: string;
  evaluationComments: string;
}

const emptyForm: JobFormData = {
  date: new Date().toISOString().slice(0, 10),
  companyName: "",
  jobTitle: "",
  detailLink: "",
  requiredSkills: "",
  employmentType: "REMOTE",
  status: "NEW",
  evaluationStatus: "PENDING",
  evaluationComments: "",
};

export default function Jobs() {
  const { data: user } = useGetMe();
  const { data: jobs, isLoading } = useListJobs();
  const createMut = useCreateJob();
  const updateMut = useUpdateJob();
  const deleteMut = useDeleteJob();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [form, setForm] = useState<JobFormData>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const isAdmin = user?.role === UserRole.CHIEF_ADMIN || user?.role === UserRole.BIDDER_MANAGER;

  const filtered = jobs?.filter((j) => {
    const q = search.toLowerCase();
    return (
      j.companyName.toLowerCase().includes(q) ||
      j.jobTitle.toLowerCase().includes(q) ||
      (j.requiredSkills?.toLowerCase().includes(q) ?? false)
    );
  });

  function openCreate() {
    setEditingJob(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(job: Job) {
    setEditingJob(job);
    setForm({
      date: job.date ? new Date(job.date).toISOString().slice(0, 10) : "",
      companyName: job.companyName,
      jobTitle: job.jobTitle,
      detailLink: job.detailLink ?? "",
      requiredSkills: job.requiredSkills ?? "",
      employmentType: job.employmentType,
      status: job.status,
      evaluationStatus: job.evaluationStatus,
      evaluationComments: job.evaluationComments ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editingJob) {
        await updateMut.mutateAsync({
          jobId: editingJob.id,
          data: {
            date: new Date(form.date).toISOString(),
            companyName: form.companyName,
            jobTitle: form.jobTitle,
            detailLink: form.detailLink || undefined,
            requiredSkills: form.requiredSkills || undefined,
            employmentType: form.employmentType as any,
            status: form.status as any,
            evaluationStatus: form.evaluationStatus as any,
            evaluationComments: form.evaluationComments || undefined,
          } as UpdateJobBody,
        });
        toast({ title: "Job updated" });
      } else {
        await createMut.mutateAsync({
          data: {
            date: new Date(form.date).toISOString(),
            companyName: form.companyName,
            jobTitle: form.jobTitle,
            detailLink: form.detailLink || undefined,
            requiredSkills: form.requiredSkills || undefined,
            employmentType: form.employmentType as any,
            status: form.status as any,
            evaluationStatus: form.evaluationStatus as any,
            evaluationComments: form.evaluationComments || undefined,
          } as CreateJobBody,
        });
        toast({ title: "Job created" });
      }
      qc.invalidateQueries({ queryKey: getListJobsQueryKey() });
      setDialogOpen(false);
    } catch {
      toast({ title: "Error saving job", variant: "destructive" });
    }
  }

  async function handleDelete() {
    if (deleteId == null) return;
    try {
      await deleteMut.mutateAsync({ jobId: deleteId });
      toast({ title: "Job deleted" });
      qc.invalidateQueries({ queryKey: getListJobsQueryKey() });
    } catch {
      toast({ title: "Error deleting job", variant: "destructive" });
    }
    setDeleteId(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Briefcase className="h-8 w-8" />
          Jobs
        </h1>
        <Button onClick={openCreate} data-testid="btn-new-job">
          <PlusCircle className="mr-2 h-4 w-4" /> New Job
        </Button>
      </div>

      <Card>
        <CardHeader className="py-4">
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search jobs..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-jobs"
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
          ) : !filtered?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              No jobs found. Click "New Job" to add one.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Company</th>
                    <th className="px-4 py-3 font-medium">Job Title</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Evaluation</th>
                    <th className="px-4 py-3 font-medium">Skills</th>
                    {isAdmin && <th className="px-4 py-3 font-medium">Bidder</th>}
                    <th className="px-4 py-3 font-medium">Updated</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((job) => (
                    <tr key={job.id} className="hover:bg-muted/30 transition-colors" data-testid={`job-row-${job.id}`}>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {new Date(job.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {job.companyName}
                        {job.detailLink && (
                          <a
                            href={job.detailLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1 inline-flex text-primary hover:text-primary/80"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3">{job.jobTitle}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {empTypeLabel(job.employmentType)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColor(job.status)}`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${evalColor(job.evaluationStatus)}`}>
                          {job.evaluationStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[200px] truncate text-muted-foreground" title={job.requiredSkills ?? ""}>
                        {job.requiredSkills || "—"}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-sm">
                          {job.createdByName || "—"}
                        </td>
                      )}
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground text-xs">
                        {new Date(job.updatedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(job)} data-testid={`btn-edit-job-${job.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {user?.role === UserRole.CHIEF_ADMIN && (
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteId(job.id)} data-testid={`btn-delete-job-${job.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingJob ? "Edit Job" : "New Job"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  data-testid="input-job-date"
                />
              </div>
              <div className="space-y-2">
                <Label>Employment Type</Label>
                <Select value={form.employmentType} onValueChange={(v) => setForm({ ...form, employmentType: v })}>
                  <SelectTrigger data-testid="select-employment-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{empTypeLabel(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Company Name *</Label>
              <Input
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="e.g. Acme Corp"
                data-testid="input-company-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Job Title *</Label>
              <Input
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                placeholder="e.g. Senior Developer"
                data-testid="input-job-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Detail Link (URL)</Label>
              <Input
                value={form.detailLink}
                onChange={(e) => setForm({ ...form, detailLink: e.target.value })}
                placeholder="https://..."
                data-testid="input-detail-link"
              />
            </div>
            <div className="space-y-2">
              <Label>Required Skills</Label>
              <Input
                value={form.requiredSkills}
                onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })}
                placeholder="e.g. React, Node.js, TypeScript"
                data-testid="input-required-skills"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger data-testid="select-job-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {JOB_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Evaluation</Label>
                <Select value={form.evaluationStatus} onValueChange={(v) => setForm({ ...form, evaluationStatus: v })}>
                  <SelectTrigger data-testid="select-eval-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVAL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Evaluation Comments</Label>
              <Textarea
                value={form.evaluationComments}
                onChange={(e) => setForm({ ...form, evaluationComments: e.target.value })}
                placeholder="Admin notes..."
                rows={3}
                data-testid="input-eval-comments"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.companyName || !form.jobTitle || createMut.isPending || updateMut.isPending}
              data-testid="btn-save-job"
            >
              {createMut.isPending || updateMut.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this job entry? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending} data-testid="btn-confirm-delete">
              {deleteMut.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
