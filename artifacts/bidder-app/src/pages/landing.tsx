import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, BarChart3, Users, MessageSquare } from "lucide-react";

export default function Landing() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link href="/" className="flex items-center justify-center">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold mr-2">
            BM
          </div>
          <span className="font-bold tracking-tight">BidderManage</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link href="/sign-in">
            <Button variant="ghost" data-testid="btn-nav-sign-in">Sign In</Button>
          </Link>
          <Link href="/sign-up">
            <Button data-testid="btn-nav-sign-up">Sign Up</Button>
          </Link>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-sidebar text-sidebar-foreground">
          <div className="container px-4 md:px-6 mx-auto text-center">
            <div className="space-y-4 max-w-[800px] mx-auto">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
                The operations center for high-performance bidding teams
              </h1>
              <p className="mx-auto max-w-[700px] text-sidebar-foreground/80 md:text-xl/relaxed lg:text-2xl/relaxed">
                Dense, fast, and organized. Manage your pipeline, track reports, and communicate in real-time.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
                <Link href="/sign-up">
                  <Button size="lg" className="w-full sm:w-auto text-lg h-12 px-8" data-testid="btn-hero-sign-up">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/sign-in">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg h-12 px-8 border-sidebar-border bg-sidebar-accent hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground" data-testid="btn-hero-sign-in">
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-12 lg:grid-cols-3">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold">Daily Reporting</h2>
                <p className="text-muted-foreground">
                  Bidders submit structured daily reports detailing projects bid, outcomes, and notes. Managers review and provide inline feedback instantly.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                  <Users className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold">Role-Based Access</h2>
                <p className="text-muted-foreground">
                  Chief Admins manage the system. Bidder Managers oversee teams. Bidders focus on their pipeline. Everyone sees exactly what they need.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                  <MessageSquare className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold">Real-Time Chat</h2>
                <p className="text-muted-foreground">
                  Keep the team connected with a persistent real-time chat panel. Know who is online and active right now.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full py-6 bg-sidebar text-sidebar-foreground/60 border-t border-sidebar-border">
        <div className="container px-4 md:px-6 mx-auto flex flex-col sm:flex-row justify-between items-center">
          <p className="text-sm">© {new Date().getFullYear()} BidderManage. All rights reserved.</p>
          <div className="flex gap-4 sm:gap-6 mt-4 sm:mt-0 text-sm">
            <span className="cursor-not-allowed hover:text-sidebar-foreground transition-colors">Terms of Service</span>
            <span className="cursor-not-allowed hover:text-sidebar-foreground transition-colors">Privacy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
