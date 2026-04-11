import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useClerk } from "@clerk/react";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Users,
  UserCircle,
  Settings,
  LogOut,
  PlusCircle,
  Menu
} from "lucide-react";
import { useGetMe, useGetPresence, useUpdatePresence, getGetPresenceQueryKey } from "@workspace/api-client-react";
import { UserRole } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { signOut } = useClerk();
  
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const { mutate: updatePresence } = useUpdatePresence();
  
  // Online presence
  useEffect(() => {
    if (!user) return;
    
    // Initial call
    updatePresence();
    
    // Poll every 60 seconds
    const interval = setInterval(() => {
      updatePresence();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [user, updatePresence]);

  const { data: presenceData } = useGetPresence({
    query: {
      queryKey: getGetPresenceQueryKey(),
      refetchInterval: 30000,
    }
  });

  const onlineUsers = presenceData?.filter(p => {
    const lastSeen = new Date(p.lastSeenAt).getTime();
    return Date.now() - lastSeen < 120000; // 2 minutes
  }) || [];

  const role = user?.role;

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: [UserRole.CHIEF_ADMIN, UserRole.BIDDER_MANAGER, UserRole.BIDDER],
    },
    {
      title: "Reports",
      href: "/reports",
      icon: FileText,
      roles: [UserRole.CHIEF_ADMIN, UserRole.BIDDER_MANAGER, UserRole.BIDDER],
    },
    {
      title: "New Report",
      href: "/reports/new",
      icon: PlusCircle,
      roles: [UserRole.BIDDER],
    },
    {
      title: "Chat",
      href: "/chat",
      icon: MessageSquare,
      roles: [UserRole.CHIEF_ADMIN, UserRole.BIDDER_MANAGER, UserRole.BIDDER],
    },
    {
      title: "Bidder Profiles",
      href: "/profiles",
      icon: UserCircle,
      roles: [UserRole.CHIEF_ADMIN, UserRole.BIDDER_MANAGER],
    },
    {
      title: "My Profile",
      href: user ? `/profiles/${user.id}` : "/profiles",
      icon: UserCircle,
      roles: [UserRole.BIDDER],
    },
    {
      title: "User Management",
      href: "/users",
      icon: Users,
      roles: [UserRole.CHIEF_ADMIN, UserRole.BIDDER_MANAGER],
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
      roles: [UserRole.CHIEF_ADMIN, UserRole.BIDDER_MANAGER, UserRole.BIDDER],
    },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (!role) return false;
    return item.roles.includes(role);
  });

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4 py-2 font-bold text-lg tracking-tight">
        <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground mr-3 shadow-md">
          BM
        </div>
        BidderManage
      </div>
      
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {visibleNavItems.map((item) => (
            <Button
              key={item.href}
              variant={location.startsWith(item.href) && (item.href !== "/reports" || location === "/reports") && (item.href !== "/profiles" || location === "/profiles") ? "secondary" : "ghost"}
              className={`w-full justify-start ${
                location === item.href || (location.startsWith(item.href) && item.href !== "/reports" && item.href !== "/profiles")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
              asChild
              data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </Link>
            </Button>
          ))}
        </nav>
      </ScrollArea>

      <div className="p-4 border-t border-sidebar-border">
        <div className="mb-4">
          <div className="text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-2 px-2">
            Who's Online ({onlineUsers.length})
          </div>
          <div className="flex flex-wrap gap-2 px-2">
            {onlineUsers.slice(0, 5).map((ou) => (
              <TooltipProvider key={ou.userId}>
                <Avatar className="w-6 h-6 border-2 border-background">
                  <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                    {ou.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </TooltipProvider>
            ))}
            {onlineUsers.length > 5 && (
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium border-2 border-background">
                +{onlineUsers.length - 5}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-md bg-sidebar-accent/50">
          {isUserLoading ? (
            <Skeleton className="w-8 h-8 rounded-full" />
          ) : (
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user?.name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
          <div className="flex flex-col flex-1 min-w-0">
            {isUserLoading ? (
              <>
                <Skeleton className="h-4 w-20 mb-1" />
                <Skeleton className="h-3 w-16" />
              </>
            ) : (
              <>
                <span className="text-sm font-medium truncate">{user?.name}</span>
                <span className="text-[10px] text-sidebar-foreground/70 truncate uppercase tracking-wider">
                  {user?.role.replace('_', ' ')}
                </span>
              </>
            )}
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          onClick={() => signOut(() => setLocation("/"))}
          data-testid="btn-sign-out"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden absolute top-4 left-4 z-40 bg-background/80 backdrop-blur-sm border-border shadow-sm">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 border-r-0 bg-sidebar">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
        <SidebarContent />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl p-4 md:p-6 lg:p-8 animate-in fade-in duration-300">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
