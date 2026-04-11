import { useListUsers, useUpdateUser, getListUsersQueryKey, useGetMe } from "@workspace/api-client-react";
import { UserRole, UpdateUserBodyRole } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Shield, User as UserIcon } from "lucide-react";

export default function Users() {
  const { data: currentUser } = useGetMe();
  const { data: users, isLoading } = useListUsers();
  const updateUser = useUpdateUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isChiefAdmin = currentUser?.role === UserRole.CHIEF_ADMIN;

  const handleRoleChange = (userId: number, newRole: UpdateUserBodyRole) => {
    updateUser.mutate({ id: userId, data: { role: newRole } }, {
      onSuccess: () => {
        toast({ title: "User role updated" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to update role", variant: "destructive" });
      }
    });
  };

  const handleStatusChange = (userId: number, isActive: boolean) => {
    updateUser.mutate({ id: userId, data: { isActive } }, {
      onSuccess: () => {
        toast({ title: "User status updated" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to update status", variant: "destructive" });
      }
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case UserRole.CHIEF_ADMIN: return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case UserRole.BIDDER_MANAGER: return <Shield className="h-4 w-4 text-primary" />;
      default: return <UserIcon className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">Manage roles, access, and teams.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
          <CardDescription>{users?.length || 0} users registered in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="rounded-md border">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users?.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {isChiefAdmin && currentUser.id !== u.id ? (
                          <Select 
                            defaultValue={u.role} 
                            onValueChange={(val: UpdateUserBodyRole) => handleRoleChange(u.id, val)}
                          >
                            <SelectTrigger className="w-[160px] h-8 text-xs" data-testid={`select-role-${u.id}`}>
                              <div className="flex items-center gap-2">
                                {getRoleIcon(u.role)}
                                <SelectValue />
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UserRole.CHIEF_ADMIN}>Chief Admin</SelectItem>
                              <SelectItem value={UserRole.BIDDER_MANAGER}>Bidder Manager</SelectItem>
                              <SelectItem value={UserRole.BIDDER}>Bidder</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="flex items-center gap-2">
                            {getRoleIcon(u.role)}
                            <Badge variant="outline" className="text-xs">{u.role.replace('_', ' ')}</Badge>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isChiefAdmin && currentUser.id !== u.id ? (
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={u.isActive} 
                              onCheckedChange={(checked) => handleStatusChange(u.id, checked)}
                              data-testid={`switch-status-${u.id}`}
                            />
                            <span className="text-xs">{u.isActive ? 'Active' : 'Inactive'}</span>
                          </div>
                        ) : (
                          <Badge variant={u.isActive ? "default" : "secondary"} className="text-[10px]">
                            {u.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {(!users || users.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                        No users found.
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
