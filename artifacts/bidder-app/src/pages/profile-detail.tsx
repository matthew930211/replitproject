import { useParams, Link } from "wouter";
import { useGetProfile, getGetProfileQueryKey, useGetMe } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, User as UserIcon, MapPin, Phone, Calendar, Download, FileText, Briefcase, Award } from "lucide-react";

export default function ProfileDetail() {
  const params = useParams();
  const userId = parseInt(params.userId || "0");
  const { data: currentUser } = useGetMe();
  
  const { data: profile, isLoading } = useGetProfile(userId, {
    query: { enabled: !!userId, queryKey: getGetProfileQueryKey(userId) }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Card><CardContent className="h-64 pt-6"><Skeleton className="h-full w-full" /></CardContent></Card>
      </div>
    );
  }

  if (!profile) {
    return <div>Profile not found</div>;
  }

  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/profiles"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Bidder Profile</h1>
        </div>
        {isOwnProfile && (
          <Button asChild data-testid="btn-edit-profile">
            <Link href="/settings">Edit Profile</Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <Avatar className="w-32 h-32 mb-4 border-4 border-background shadow-md">
                {profile.photoObjectPath && (
                  <AvatarImage src={`/api/storage/objects/${profile.photoObjectPath.replace('/objects/', '')}`} />
                )}
                <AvatarFallback className="bg-primary/10 text-primary text-4xl">
                  {profile.userName?.charAt(0).toUpperCase() || <UserIcon className="h-12 w-12" />}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-2xl font-bold">{profile.userName || `User #${profile.userId}`}</h2>
              <Badge variant="outline" className="mt-2 mb-4">Bidder</Badge>

              <div className="w-full space-y-3 mt-4 text-sm">
                {profile.phone && (
                  <div className="flex items-center text-muted-foreground">
                    <Phone className="h-4 w-4 mr-3" />
                    <span>{profile.phone}</span>
                  </div>
                )}
                {profile.address && (
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-3" />
                    <span>{profile.address}</span>
                  </div>
                )}
                {profile.birthDate && (
                  <div className="flex items-center text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-3" />
                    <span>{new Date(profile.birthDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {profile.resumeObjectPath && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Resume</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href={`/api/storage/objects/${profile.resumeObjectPath.replace('/objects/', '')}`} target="_blank" rel="noreferrer" download>
                    <FileText className="mr-2 h-4 w-4" />
                    <span className="flex-1 text-left truncate">{profile.resumeFileName || "Download Resume"}</span>
                    <Download className="ml-2 h-4 w-4 text-muted-foreground" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
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
                {profile.skills ? profile.skills.split(',').map((skill, i) => (
                  <Badge key={i} variant="secondary">{skill.trim()}</Badge>
                )) : (
                  <span className="text-sm text-muted-foreground">No skills listed.</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
