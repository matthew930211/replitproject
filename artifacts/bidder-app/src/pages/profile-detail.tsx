import { useState } from "react";
import { useParams, Link } from "wouter";
import {
  useGetProfile,
  useUpdateProfile,
  useDeleteProfile,
  useAddProfileResume,
  useDeleteProfileResume,
  useGrantProfileAccess,
  useRevokeProfileAccess,
  useListUsers,
  useGetMe,
  getGetProfileQueryKey,
  getListProfilesQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useUpload, type UploadResponse } from "@workspace/object-storage-web";
import {
  ArrowLeft,
  User as UserIcon,
  MapPin,
  Phone,
  Calendar,
  Download,
  FileText,
  Briefcase,
  Award,
  Edit,
  Trash2,
  Plus,
  Loader2,
  Upload,
  UserPlus,
  UserMinus,
  Mail,
  Linkedin,
  Github,
} from "lucide-react";
import { useLocation } from "wouter";

const emptyEditForm = {
  firstName: "",
  lastName: "",
  email: "",
  linkedin: "",
  github: "",
  phone: "",
  address: "",
  birthDate: "",
  bio: "",
  skills: "",
  experience: "",
};

export default function ProfileDetail() {
  const params = useParams();
  const profileId = parseInt(params.profileId || "0");
  const { data: currentUser } = useGetMe();
  const { data: profile, isLoading } = useGetProfile(profileId, {
    query: { enabled: !!profileId, queryKey: getGetProfileQueryKey(profileId) },
  });
  const { data: allUsers } = useListUsers({ role: "BIDDER" });

  const updateProfile = useUpdateProfile();
  const deleteProfile = useDeleteProfile();
  const addResume = useAddProfileResume();
  const deleteResume = useDeleteProfileResume();
  const grantAccess = useGrantProfileAccess();
  const revokeAccess = useRevokeProfileAccess();

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const isAdmin = currentUser?.role === "CHIEF_ADMIN";
  const isManager = currentUser?.role === "BIDDER_MANAGER";

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyEditForm);

  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [resumeLabel, setResumeLabel] = useState("");
  const [pendingResumeObjectPath, setPendingResumeObjectPath] = useState("");
  const [pendingResumeFileName, setPendingResumeFileName] = useState("");

  const [selectedBidderId, setSelectedBidderId] = useState<string>("");

  function openEditDialog() {
    if (!profile) return;
    setEditForm({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: profile.email || "",
      linkedin: profile.linkedin || "",
      github: profile.github || "",
      phone: profile.phone || "",
      address: profile.address || "",
      birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split("T")[0] : "",
      bio: profile.bio || "",
      skills: profile.skills || "",
      experience: profile.experience || "",
    });
    setEditDialogOpen(true);
  }

  function handleEditSubmit() {
    updateProfile.mutate(
      {
        profileId,
        data: {
          firstName: editForm.firstName.trim() || undefined,
          lastName: editForm.lastName.trim() || undefined,
          email: editForm.email || undefined,
          linkedin: editForm.linkedin || undefined,
          github: editForm.github || undefined,
          phone: editForm.phone || undefined,
          address: editForm.address || undefined,
          birthDate: editForm.birthDate || undefined,
          bio: editForm.bio || undefined,
          skills: editForm.skills || undefined,
          experience: editForm.experience || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey(profileId) });
          queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() });
          toast({ title: "Profile updated" });
          setEditDialogOpen(false);
        },
        onError: () => {
          toast({ title: "Failed to update profile", variant: "destructive" });
        },
      }
    );
  }

  function handleDeleteProfile() {
    deleteProfile.mutate(
      { profileId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() });
          toast({ title: "Profile deleted" });
          setLocation("/profiles");
        },
        onError: () => {
          toast({ title: "Failed to delete profile", variant: "destructive" });
        },
      }
    );
  }

  const { uploadFile: uploadResumeFile, isUploading: isResumeUploading } = useUpload({
    onSuccess: (res: UploadResponse) => {
      setPendingResumeObjectPath(res.objectPath);
      setPendingResumeFileName(res.metadata.name);
    },
    onError: () => toast({ title: "Failed to upload file", variant: "destructive" }),
  });

  function handleAddResume() {
    if (!pendingResumeObjectPath) {
      toast({ title: "Please upload a file first", variant: "destructive" });
      return;
    }
    addResume.mutate(
      {
        profileId,
        data: {
          label: resumeLabel || undefined,
          resumeObjectPath: pendingResumeObjectPath,
          resumeFileName: pendingResumeFileName || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey(profileId) });
          toast({ title: "Resume added" });
          setResumeDialogOpen(false);
          setResumeLabel("");
          setPendingResumeObjectPath("");
          setPendingResumeFileName("");
        },
        onError: () => {
          toast({ title: "Failed to add resume", variant: "destructive" });
        },
      }
    );
  }

  function handleDeleteResume(resumeId: number) {
    deleteResume.mutate(
      { profileId, resumeId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey(profileId) });
          toast({ title: "Resume deleted" });
        },
        onError: () => {
          toast({ title: "Failed to delete resume", variant: "destructive" });
        },
      }
    );
  }

  function handleGrantAccess() {
    if (!selectedBidderId) return;
    grantAccess.mutate(
      { profileId, data: { bidderId: parseInt(selectedBidderId) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey(profileId) });
          toast({ title: "Access granted" });
          setSelectedBidderId("");
        },
        onError: () => {
          toast({ title: "Failed to grant access", variant: "destructive" });
        },
      }
    );
  }

  function handleRevokeAccess(bidderId: number) {
    revokeAccess.mutate(
      { profileId, bidderId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey(profileId) });
          toast({ title: "Access revoked" });
        },
        onError: () => {
          toast({ title: "Failed to revoke access", variant: "destructive" });
        },
      }
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card>
          <CardContent className="h-64 pt-6">
            <Skeleton className="h-full w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/profiles">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <p>Profile not found or access denied.</p>
      </div>
    );
  }

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Unknown";
  const grantedBidderIds = new Set(profile.accessGrants.map((a) => a.bidderId));
  const eligibleBidders = (allUsers || []).filter((u) => {
    if (grantedBidderIds.has(u.id)) return false;
    if (isManager && u.managerId !== currentUser?.id) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/profiles">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Candidate Profile</h1>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={openEditDialog} data-testid="btn-edit-profile">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" data-testid="btn-delete-profile">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Profile?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the candidate profile, all their resumes, and all
                    access grants. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteProfile}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Avatar className="w-32 h-32 mb-4 border-4 border-background shadow-md">
                {profile.photoObjectPath && (
                  <AvatarImage
                    src={`/api/storage/objects/${profile.photoObjectPath.replace("/objects/", "")}`}
                  />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-4xl">
                  {profile.firstName?.charAt(0)?.toUpperCase() || <UserIcon className="h-12 w-12" />}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold">{fullName}</h2>
              <Badge variant="outline" className="mt-2 mb-4">
                Candidate
              </Badge>

              <div className="w-full space-y-3 mt-2 text-sm text-left">
                {profile.email && (
                  <div className="flex items-center text-muted-foreground gap-2">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <a href={`mailto:${profile.email}`} className="hover:underline truncate">{profile.email}</a>
                  </div>
                )}
                {profile.phone && (
                  <div className="flex items-center text-muted-foreground gap-2">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.address && (
                  <div className="flex items-center text-muted-foreground gap-2">
                    <MapPin className="h-4 w-4 flex-shrink-0" />
                    <span>{profile.address}</span>
                  </div>
                )}
                {profile.birthDate && (
                  <div className="flex items-center text-muted-foreground gap-2">
                    <Calendar className="h-4 w-4 flex-shrink-0" />
                    <span>{new Date(profile.birthDate).toLocaleDateString()}</span>
                  </div>
                )}
                {profile.linkedin && (
                  <div className="flex items-center text-muted-foreground gap-2">
                    <Linkedin className="h-4 w-4 flex-shrink-0" />
                    <a
                      href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://${profile.linkedin}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline truncate"
                    >
                      LinkedIn
                    </a>
                  </div>
                )}
                {profile.github && (
                  <div className="flex items-center text-muted-foreground gap-2">
                    <Github className="h-4 w-4 flex-shrink-0" />
                    <a
                      href={profile.github.startsWith("http") ? profile.github : `https://${profile.github}`}
                      target="_blank"
                      rel="noreferrer"
                      className="hover:underline truncate"
                    >
                      GitHub
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" /> About
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {profile.bio || "No bio provided."}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" /> Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {profile.experience || "No experience details provided."}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" /> Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.skills ? (
                  profile.skills.split(",").map((skill, i) => (
                    <Badge key={i} variant="secondary">
                      {skill.trim()}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No skills listed.</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Resumes
              </CardTitle>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResumeDialogOpen(true)}
                  data-testid="btn-add-resume"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Resume
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {profile.resumes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No resumes uploaded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {profile.resumes.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          {r.label && (
                            <p className="text-sm font-medium truncate">{r.label}</p>
                          )}
                          <p className="text-xs text-muted-foreground truncate">
                            {r.resumeFileName || r.resumeObjectPath}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <Button variant="ghost" size="icon" asChild data-testid={`btn-download-resume-${r.id}`}>
                          <a
                            href={`/api/storage/objects/${r.resumeObjectPath.replace("/objects/", "")}`}
                            target="_blank"
                            rel="noreferrer"
                            download
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        {isAdmin && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                data-testid={`btn-delete-resume-${r.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Resume?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Remove "{r.label || r.resumeFileName || "this resume"}" from the
                                  profile? This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteResume(r.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {(isAdmin || isManager) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" /> Access Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Select value={selectedBidderId} onValueChange={setSelectedBidderId}>
                    <SelectTrigger className="flex-1" data-testid="select-grant-bidder">
                      <SelectValue placeholder="Select a bidder to grant access..." />
                    </SelectTrigger>
                    <SelectContent>
                      {eligibleBidders.length === 0 ? (
                        <SelectItem value="__none__" disabled>
                          No eligible bidders
                        </SelectItem>
                      ) : (
                        eligibleBidders.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleGrantAccess}
                    disabled={!selectedBidderId || grantAccess.isPending}
                    data-testid="btn-grant-access"
                  >
                    {grantAccess.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {profile.accessGrants.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No bidders have been granted access yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {profile.accessGrants.map((a) => (
                      <li
                        key={a.id}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                      >
                        <span className="text-sm font-medium">{a.bidderName ?? `Bidder #${a.bidderId}`}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRevokeAccess(a.bidderId)}
                          data-testid={`btn-revoke-access-${a.bidderId}`}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Candidate Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>First Name *</Label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))}
                  data-testid="input-edit-first-name"
                />
              </div>
              <div className="space-y-1">
                <Label>Last Name *</Label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))}
                  data-testid="input-edit-last-name"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>LinkedIn</Label>
                <Input
                  value={editForm.linkedin}
                  onChange={(e) => setEditForm((f) => ({ ...f, linkedin: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>GitHub</Label>
                <Input
                  value={editForm.github}
                  onChange={(e) => setEditForm((f) => ({ ...f, github: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Birthday</Label>
                <Input
                  type="date"
                  value={editForm.birthDate}
                  onChange={(e) => setEditForm((f) => ({ ...f, birthDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Skills (comma-separated)</Label>
              <Input
                value={editForm.skills}
                onChange={(e) => setEditForm((f) => ({ ...f, skills: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Bio</Label>
              <Textarea
                value={editForm.bio}
                onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-1">
              <Label>Experience Summary</Label>
              <Textarea
                value={editForm.experience}
                onChange={(e) => setEditForm((f) => ({ ...f, experience: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateProfile.isPending}
              data-testid="btn-edit-profile-submit"
            >
              {updateProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Resume Dialog */}
      <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Resume</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Label (optional)</Label>
              <Input
                value={resumeLabel}
                onChange={(e) => setResumeLabel(e.target.value)}
                placeholder="e.g. Software Engineer - 2024"
                data-testid="input-resume-label"
              />
            </div>
            <div className="space-y-1">
              <Label>File</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="w-full relative"
                  disabled={isResumeUploading}
                  data-testid="btn-upload-resume-file"
                  asChild
                >
                  <label className="cursor-pointer">
                    {isResumeUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {pendingResumeFileName || "Choose file..."}
                    <input
                      type="file"
                      className="sr-only"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadResumeFile(file);
                      }}
                    />
                  </label>
                </Button>
              </div>
              {pendingResumeFileName && (
                <p className="text-xs text-green-600">✓ {pendingResumeFileName}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResumeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddResume}
              disabled={!pendingResumeObjectPath || addResume.isPending}
              data-testid="btn-submit-resume"
            >
              {addResume.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
