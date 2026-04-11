import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from "@clerk/react";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { useEffect, useRef, useState } from "react";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getGetMeQueryKey } from "@workspace/api-client-react";

// Pages
import Landing from "./pages/landing";
import Dashboard from "./pages/dashboard";
import Reports from "./pages/reports";
import NewReport from "./pages/new-report";
import ReportDetail from "./pages/report-detail";
import Chat from "./pages/chat";
import Users from "./pages/users";
import Profiles from "./pages/profiles";
import ProfileDetail from "./pages/profile-detail";
import Settings from "./pages/settings";
import NotFound from "./pages/not-found";
import { AppLayout } from "./components/layout/app-layout";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

function SignInPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

type SyncState = "idle" | "syncing" | "ok" | "not_provisioned" | "error";

function UserSync() {
  const { isLoaded, isSignedIn } = useUser();
  const { session, signOut } = useClerk();
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const syncedRef = useRef(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (isLoaded && isSignedIn && !syncedRef.current) {
      syncedRef.current = true;
      setSyncState("syncing");
      session?.getToken().then(token => {
        return fetch('/api/users/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({})
        });
      }).then(async res => {
        if (res.ok) {
          setSyncState("ok");
          await qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        } else if (res.status === 403) {
          setSyncState("not_provisioned");
        } else {
          setSyncState("error");
        }
      }).catch(() => {
        setSyncState("error");
      });
    }
    if (isLoaded && !isSignedIn) {
      syncedRef.current = false;
      setSyncState("idle");
    }
  }, [isLoaded, isSignedIn, session, qc]);

  if (syncState === "not_provisioned") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-4 rounded-lg border bg-card p-8 shadow">
          <div className="text-2xl font-semibold">Access Not Provisioned</div>
          <p className="text-muted-foreground">
            Your account has not been set up in the system yet. Please contact an administrator to get access.
          </p>
          <p className="text-sm text-muted-foreground">
            If you believe this is an error, make sure you are using the email address your administrator used to invite you.
          </p>
          <button
            onClick={() => signOut()}
            className="mt-4 rounded bg-primary px-4 py-2 text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/dashboard" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  return (
    <>
      <Show when="signed-in">
        <AppLayout>
          <Component />
        </AppLayout>
      </Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/reports"><ProtectedRoute component={Reports} /></Route>
      <Route path="/reports/new"><ProtectedRoute component={NewReport} /></Route>
      <Route path="/reports/:id"><ProtectedRoute component={ReportDetail} /></Route>
      <Route path="/chat"><ProtectedRoute component={Chat} /></Route>
      <Route path="/users"><ProtectedRoute component={Users} /></Route>
      <Route path="/profiles"><ProtectedRoute component={Profiles} /></Route>
      <Route path="/profiles/:profileId"><ProtectedRoute component={ProfileDetail} /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <UserSync />
        <AppRoutes />
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}
