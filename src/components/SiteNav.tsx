import { Link, useLocation } from "react-router-dom";
import { Zap } from "lucide-react";

export function SiteNav() {
  const { pathname } = useLocation();

  const linkClass = (path: string) =>
    `text-sm font-medium transition-colors hover:text-primary ${
      pathname === path ? "text-primary" : "text-muted-foreground"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <span className="font-display text-lg font-bold tracking-tight">ENERGYPULSE</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className={linkClass("/")}>Latest</Link>
          <Link to="/archive" className={linkClass("/archive")}>Archive</Link>
        </div>
      </div>
    </nav>
  );
}
