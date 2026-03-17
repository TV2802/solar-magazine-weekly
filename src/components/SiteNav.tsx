import { Link, useLocation } from "react-router-dom";
import { Zap, Activity } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function SiteNav() {
  const { pathname } = useLocation();

  const linkClass = (path: string) =>
    `font-mono text-[11px] font-medium uppercase tracking-[0.15em] transition-colors hover:text-primary ${
      pathname === path ? "text-primary" : "text-muted-foreground"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="font-display text-base font-bold tracking-tight">ENERGYPULSE</span>
        </Link>
        <div className="flex items-center gap-5">
          <Link to="/" className={linkClass("/")}>Articles</Link>
          <Link
            to="/market"
            className={`flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.15em] transition-colors hover:text-primary ${
              pathname === "/market" ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Market
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

