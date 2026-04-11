import { useState } from "react";
import { useListUsers, useUpdateUser, useCreateUser, getListUsersQueryKey, useGetMe } from "@workspace/api-client-react";
import { UserRole, UpdateUserBodyRole, CreateUserBodyRole } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Shield, User as UserIcon, UserPlus } from "lucide-react";

export default function Users() {
  const { data: currentUser } = useGetMe();
  const { data: users, isLoading } = useListUsers();
  const updateUser = useUpdateUser();
  const createUser = useCreateUser();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<CreateUserBodyRole>(UserRole.BIDDER as CreateUserBodyRole);
  const [newManagerId, setNewManagerId] = useState<string>("");

  const isChiefAdmin = currentUser?.role === UserRole.CHIEF_ADMIN;
  const managers = users?.filter(u => u.role === UserRole.BIDDER_MANAGER) ?? [];

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

  const handleManagerChange = (userId: number, managerId: number | null) => {
    updateUser.mutate({ id: userId, data: { managerId } }, {
      onSuccess: () => {
        toast({ title: "Manager assignment updated" });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
      },
      onError: () => {
        toast({ title: "Failed to update manager", variant: "destructive" });
      }
    });
  };

  const handleCreateUser = () => {
    if (!newEmail || !newName || !newRole) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    const managerIdNum = newManagerId ? parseInt(newManagerId, 10) : undefined;
    createUser.mutate({
      data: {
        email: newEmail,
        name: newName,
        role: newRole,
        managerId: managerIdNum ?? null,
      }
    }, {
      onSuccess: () => {
        toast({ title: "User created successfully", description: `${newName} will be linked to their account on first sign-in.` });
        queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });
        setIsCreateOpen(false);
        setNewEmail("");
        setNewName("");
        setNewRole(UserRole.BIDDER as CreateUserBodyRole);
        setNewManagerId("");
      },
      onError: () => {
        toast({ title: "Failed to create user", variant: "destructive" });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">Manage roles, access, and teams.</p>
        </div>
        {isChiefAdmin && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="btn-create-user">
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Add a new user to the platform. They will be linked to this account when they first sign in with this email address.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="new-user-name">Full Name *</Label>
                  <Input
                    id="new-user-name"
                    placeholder="Jane Smith"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    data-testid="input-new-user-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-user-email">Email Address *</Label>
                  <Input
                    id="new-user-email"
                    type="email"
                    placeholder="jane@example.com"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    data-testid="input-new-user-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-user-role">Role *</Label>
                  <Select value={newRole} onValueChange={(val: CreateUserBodyRole) => setNewRole(val)}>
                    <SelectTrigger id="new-user-role" data-testid="select-new-user-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UserRole.CHIEF_ADMIN}>Chief Admin</SelectItem>
                      <SelectItem value={UserRole.BIDDER_MANAGER}>Bidder Manager</SelectItem>
                      <SelectItem value={UserRole.BIDDER}>Bidder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newRole === UserRole.BIDDER && managers.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="new-user-manager">Assign Manager</Label>
                    <Select value={newManagerId} onValueChange={setNewManagerId}>
                      <SelectTrigger id="new-user-manager" data-testid="select-new-user-manager">
                        <SelectValue placeholder="Select a manager..." />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.map(m => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateUser} disabled={createUser.isPending} data-testid="btn-submit-create-user">
                  {createUser.isPending ? "Creating..." : "Create User"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
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
                    <th className="px-4 py-3 font-medium">Manager</th>
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
                        {isChiefAdmin && u.role === UserRole.BIDDER && currentUser.id !== u.id ? (
                          <Select
                            value={u.managerId != null ? String(u.managerId) : "none"}
                            onValueChange={(val) => handleManagerChange(u.id, val === "none" ? null : parseInt(val, 10))}
                          >
                            <SelectTrigger className="w-[160px] h-8 text-xs" data-testid={`select-manager-${u.id}`}>
                              <SelectValue placeholder="No manager" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No manager</SelectItem>
                              {managers.map(m => (
                                <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {u.managerId != null ? (users?.find(m => m.id === u.managerId)?.name ?? "—") : "—"}
                          </span>
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
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
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
