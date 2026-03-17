import { Link, useLocation } from "react-router-dom";
import { Zap, Activity, Bookmark } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

interface SiteNavProps {
  onOpenSaved?: () => void;
}

export function SiteNav({ onOpenSaved }: SiteNavProps) {
  const { pathname } = useLocation();

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="font-display text-base font-bold tracking-tight">PULSE</span>
        </Link>
        <div className="flex items-center gap-5">
          <Link
            to="/market"
            className={`flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.15em] transition-colors hover:text-primary ${
              pathname.startsWith("/market") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            Market
          </Link>
          <button
            onClick={onOpenSaved}
            className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
            aria-label="Saved articles"
          >
            <Bookmark className="h-4 w-4" />
          </button>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
