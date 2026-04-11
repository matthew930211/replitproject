import { useState } from "react";
import { useListProfiles, useCreateProfile, getListProfilesQueryKey, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { User as UserIcon, Plus, FileText, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  linkedin: "",
  github: "",
  phone: "",
  birthDate: "",
  address: "",
  bio: "",
  skills: "",
  experience: "",
};

export default function Profiles() {
  const { data: currentUser } = useGetMe();
  const { data: profiles, isLoading } = useListProfiles();
  const createProfile = useCreateProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isAdmin = currentUser?.role === "CHIEF_ADMIN";
  const isBidder = currentUser?.role === "BIDDER";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  function handleCreate() {
    if (!form.firstName.trim()) {
      toast({ title: "First name is required", variant: "destructive" });
      return;
    }
    if (!form.lastName.trim()) {
      toast({ title: "Last name is required", variant: "destructive" });
      return;
    }
    createProfile.mutate(
      {
        data: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email || undefined,
          linkedin: form.linkedin || undefined,
          github: form.github || undefined,
          phone: form.phone || undefined,
          birthDate: form.birthDate || undefined,
          address: form.address || undefined,
          bio: form.bio || undefined,
          skills: form.skills || undefined,
          experience: form.experience || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProfilesQueryKey() });
          toast({ title: "Profile created" });
          setDialogOpen(false);
          setForm(emptyForm);
        },
        onError: () => {
          toast({ title: "Failed to create profile", variant: "destructive" });
        },
      }
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Candidate Profiles</h1>
          <p className="text-muted-foreground">
            {isBidder
              ? "Profiles you have been granted access to."
              : "Manage candidate profiles and their access."}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => setDialogOpen(true)} data-testid="btn-add-profile">
            <Plus className="mr-2 h-4 w-4" />
            Add Profile
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {(!profiles || profiles.length === 0) ? (
            <div className="py-16 text-center text-muted-foreground border rounded-lg border-dashed">
              {isBidder
                ? "You haven't been granted access to any profiles yet. Contact your manager or admin."
                : "No candidate profiles yet. Click \"Add Profile\" to create one."}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {profiles.map((profile) => {
                const fullName = `${profile.firstName} ${profile.lastName}`;
                return (
                  <Link key={profile.id} href={`/profiles/${profile.id}`}>
                    <Card
                      className="h-full hover:border-primary/50 transition-colors cursor-pointer group"
                      data-testid={`card-profile-${profile.id}`}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-4">
                          <Avatar className="w-12 h-12 border-2 border-background group-hover:border-primary/20 transition-colors">
                            {profile.photoObjectPath && (
                              <AvatarImage
                                src={`/api/storage/objects/${profile.photoObjectPath.replace("/objects/", "")}`}
                              />
                            )}
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {profile.firstName.charAt(0).toUpperCase() || <UserIcon className="h-6 w-6" />}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">{fullName}</CardTitle>
                            <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                              <FileText className="h-3 w-3" />
                              {profile.resumes.length} resume{profile.resumes.length !== 1 ? "s" : ""}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[60px]">
                          {profile.bio || "No bio provided."}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-auto">
                          {profile.skills ? (
                            profile.skills
                              .split(",")
                              .slice(0, 3)
                              .map((skill, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                                  {skill.trim()}
                                </Badge>
                              ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No skills listed</span>
                          )}
                          {profile.skills && profile.skills.split(",").length > 3 && (
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              +{profile.skills.split(",").length - 3}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Candidate Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  placeholder="Jane"
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  placeholder="Smith"
                  data-testid="input-last-name"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jane@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <Input
                  id="linkedin"
                  value={form.linkedin}
                  onChange={(e) => setForm((f) => ({ ...f, linkedin: e.target.value }))}
                  placeholder="linkedin.com/in/jane"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="github">GitHub</Label>
                <Input
                  id="github"
                  value={form.github}
                  onChange={(e) => setForm((f) => ({ ...f, github: e.target.value }))}
                  placeholder="github.com/jane"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 555 000 0000"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="birthDate">Birthday</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="Austin, TX"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="skills">Skills (comma-separated)</Label>
              <Input
                id="skills"
                value={form.skills}
                onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))}
                placeholder="React, Node.js, TypeScript"
                data-testid="input-profile-skills"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Brief description of the candidate..."
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="experience">Experience Summary</Label>
              <Textarea
                id="experience"
                value={form.experience}
                onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}
                placeholder="Summary of past roles and achievements..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createProfile.isPending}
              data-testid="btn-create-profile-submit"
            >
              {createProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
