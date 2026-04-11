import { useState, useEffect } from "react";
import { useGetMe, useGetProfile, getGetProfileQueryKey, useUpsertProfile } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useUpload, type UploadResponse } from "@workspace/object-storage-web";
import { useQueryClient } from "@tanstack/react-query";

const profileSchema = z.object({
  bio: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  birthDate: z.string().optional(),
  skills: z.string().optional(),
  experience: z.string().optional(),
});

export default function Settings() {
  const { data: user } = useGetMe();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const upsertProfile = useUpsertProfile();

  const { data: profile, isLoading } = useGetProfile(user?.id || 0, {
    query: { enabled: !!user?.id, queryKey: getGetProfileQueryKey(user?.id || 0) }
  });

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: "",
      phone: "",
      address: "",
      birthDate: "",
      skills: "",
      experience: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        bio: profile.bio || "",
        phone: profile.phone || "",
        address: profile.address || "",
        birthDate: profile.birthDate ? new Date(profile.birthDate).toISOString().split('T')[0] : "",
        skills: profile.skills || "",
        experience: profile.experience || "",
      });
    }
  }, [profile, form]);

  const { uploadFile: uploadPhoto, isUploading: isPhotoUploading } = useUpload({
    onSuccess: (res: UploadResponse) => {
      if (!user?.id) return;
      upsertProfile.mutate({ userId: user.id, data: { photoObjectPath: res.objectPath } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey(user.id) });
          toast({ title: "Photo updated" });
        }
      });
    },
    onError: () => toast({ title: "Failed to upload photo", variant: "destructive" })
  });

  const [pendingResumeName, setPendingResumeName] = useState<string>("");
  const { uploadFile: uploadResumeFile, isUploading: isResumeUploading } = useUpload({
    onSuccess: (res: UploadResponse) => {
      if (!user?.id) return;
      upsertProfile.mutate({ userId: user.id, data: { resumeObjectPath: res.objectPath, resumeFileName: pendingResumeName || res.metadata.name } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey(user.id) });
          toast({ title: "Resume updated" });
        }
      });
    },
    onError: () => toast({ title: "Failed to upload resume", variant: "destructive" })
  });

  const uploadResume = (file: File) => {
    setPendingResumeName(file.name);
    uploadResumeFile(file);
  };

  function onSubmit(values: z.infer<typeof profileSchema>) {
    if (!user?.id) return;
    upsertProfile.mutate({ userId: user.id, data: values }, {
      onSuccess: () => {
        toast({ title: "Profile updated successfully" });
        queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey(user.id) });
      },
      onError: () => {
        toast({ title: "Failed to update profile", variant: "destructive" });
      }
    });
  }

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your personal profile and preferences.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
            <CardDescription>Upload a professional headshot.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            <div className="w-32 h-32 rounded-full overflow-hidden bg-muted border-4 border-background shadow-sm flex items-center justify-center">
              {profile?.photoObjectPath ? (
                <img src={`/api/storage/objects/${profile.photoObjectPath.replace('/objects/', '')}`} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl text-muted-foreground">{user?.name?.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="w-full max-w-xs">
              <Input 
                type="file" 
                accept="image/*" 
                onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
                disabled={isPhotoUploading}
                className="cursor-pointer"
                data-testid="input-upload-photo"
              />
              {isPhotoUploading && <p className="text-xs text-center mt-2 text-muted-foreground animate-pulse">Uploading...</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resume / CV</CardTitle>
            <CardDescription>Upload your latest resume.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile?.resumeObjectPath && (
              <div className="p-3 bg-muted/50 rounded-md text-sm truncate">
                Current: <span className="font-medium">{profile.resumeFileName || 'Resume uploaded'}</span>
              </div>
            )}
            <Input 
              type="file" 
              accept=".pdf,.doc,.docx" 
              onChange={(e) => e.target.files?.[0] && uploadResume(e.target.files[0])}
              disabled={isResumeUploading}
              className="cursor-pointer"
              data-testid="input-upload-resume"
            />
            {isResumeUploading && <p className="text-xs text-center mt-2 text-muted-foreground animate-pulse">Uploading...</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your contact details and bio.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl><Input {...field} data-testid="input-profile-phone" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Birth Date</FormLabel>
                      <FormControl><Input type="date" {...field} data-testid="input-profile-birthdate" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location / Address</FormLabel>
                    <FormControl><Input {...field} data-testid="input-profile-address" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tell the team about yourself..." className="min-h-[100px]" {...field} data-testid="textarea-profile-bio" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="skills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Skills (Comma separated)</FormLabel>
                    <FormControl><Input placeholder="e.g. Negotiation, Analysis, Excel" {...field} data-testid="input-profile-skills" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="experience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience Summary</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Summary of your past roles and achievements..." className="min-h-[100px]" {...field} data-testid="textarea-profile-experience" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end border-t pt-6 mt-2">
              <Button type="submit" disabled={upsertProfile.isPending} data-testid="btn-save-profile">
                {upsertProfile.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
