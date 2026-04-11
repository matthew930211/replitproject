import { useListProfiles } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { User as UserIcon, Briefcase } from "lucide-react";

export default function Profiles() {
  const { data: profiles, isLoading } = useListProfiles();

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bidder Profiles</h1>
        <p className="text-muted-foreground">Directory of bidding team members and their expertise.</p>
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {profiles?.map((profile) => (
            <Link key={profile.id} href={`/profiles/${profile.userId}`}>
              <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group" data-testid={`card-profile-${profile.userId}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-12 h-12 border-2 border-background group-hover:border-primary/20 transition-colors">
                      {profile.photoObjectPath && (
                        <AvatarImage src={`/api/storage/objects/${profile.photoObjectPath.replace('/objects/', '')}`} />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {profile.userName?.charAt(0).toUpperCase() || <UserIcon className="h-6 w-6" />}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{profile.userName || `User #${profile.userId}`}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1 text-xs">
                        <Briefcase className="h-3 w-3" /> Bidder
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4 min-h-[60px]">
                    {profile.bio || "No bio provided."}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    {profile.skills ? profile.skills.split(',').slice(0, 3).map((skill, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] font-normal">{skill.trim()}</Badge>
                    )) : (
                      <span className="text-xs text-muted-foreground">No skills listed</span>
                    )}
                    {profile.skills && profile.skills.split(',').length > 3 && (
                      <Badge variant="secondary" className="text-[10px] font-normal">+{profile.skills.split(',').length - 3}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {(!profiles || profiles.length === 0) && (
            <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg border-dashed">
              No profiles found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
