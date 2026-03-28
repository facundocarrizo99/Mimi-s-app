"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  streakCount?: number;
  coupleId?: string;
}

function NavIcon({ kind }: { kind: "spaces" | "today" | "history" | "settings" | "weekly" }) {
  const common = "w-5 h-5";
  if (kind === "spaces") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-8.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "today") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <rect x="4" y="6" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 3.5v4M16 3.5v4M4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "weekly") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <rect x="4" y="6" width="16" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M4 10h16M9 14h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="9" cy="17" r="0.8" fill="currentColor" />
        <circle cx="15" cy="17" r="0.8" fill="currentColor" />
      </svg>
    );
  }
  if (kind === "history") {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
        <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 8.5v4l2.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" className={common} aria-hidden>
      <path d="M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.6 13.1a1 1 0 0 1 0-2.2l1-.2a6.8 6.8 0 0 1 .7-1.6L5.7 8a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 1.4 0l.7.6c.5-.3 1-.5 1.6-.7l.2-1a1 1 0 0 1 1.1-.8h1.4a1 1 0 0 1 1 .8l.2 1c.6.2 1.1.4 1.6.7l.7-.6a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4l-.6.7c.3.5.5 1 .7 1.6l1 .2a1 1 0 0 1 .8 1.1v1.4a1 1 0 0 1-.8 1.1l-1 .2c-.2.6-.4 1.1-.7 1.6l.6.7a1 1 0 0 1 0 1.4l-1 1a1 1 0 0 1-1.4 0l-.7-.6c-.5.3-1 .5-1.6.7l-.2 1a1 1 0 0 1-1 .8h-1.4a1 1 0 0 1-1.1-.8l-.2-1a6.8 6.8 0 0 1-1.6-.7l-.7.6a1 1 0 0 1-1.4 0l-1-1a1 1 0 0 1 0-1.4l.6-.7c-.3-.5-.5-1-.7-1.6l-1-.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AppShell({ children, streakCount, coupleId }: AppShellProps) {
  const pathname = usePathname();

  const navItems = [
    { href: coupleId ? `/monthly-summary?couple=${coupleId}` : "/couples", matchPath: "/monthly-summary", label: "Home", icon: "spaces" as const },
    { href: coupleId ? `/daily?couple=${coupleId}` : "/couples", matchPath: "/daily", label: "Today", icon: "today" as const },
    { href: coupleId ? `/weekly-checkin?couple=${coupleId}` : "/couples", matchPath: "/weekly-checkin", label: "Weekly", icon: "weekly" as const },
    { href: coupleId ? `/past-days?couple=${coupleId}` : "/couples", matchPath: "/past-days", label: "Past Days", icon: "history" as const },
    { href: "/settings", matchPath: "/settings", label: "Settings", icon: "settings" as const },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[var(--md-sys-color-surface)]/85 border-b border-[var(--md-sys-color-outline-variant)]/45">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/couples" className="text-xl font-semibold tracking-tight text-textprimary">
            <span className="inline-flex items-center gap-2">
              <span className="inline-grid place-items-center w-8 h-8 rounded-full bg-[var(--md-sys-color-primary-container)] text-base">
                ♡
              </span>
              Ours
            </span>
          </Link>
          {streakCount !== undefined && streakCount > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-[var(--md-sys-color-tertiary-container)] text-textsecondary flex items-center gap-1.5">
              {streakCount} day{streakCount !== 1 ? "s" : ""} ✨
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {children}
      </main>

      <nav className="sticky bottom-0 z-40 backdrop-blur-xl bg-[var(--md-sys-color-surface)]/90 border-t border-[var(--md-sys-color-outline-variant)]/45">
        <div className="max-w-lg mx-auto px-2 py-1.5 flex justify-around">
          {navItems.map((item) => (
            <Link
              key={item.matchPath}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-colors text-center min-w-16",
                pathname === item.matchPath || pathname.startsWith(item.matchPath + "/")
                  ? "text-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/10"
                  : "text-textmuted hover:text-textsecondary md3-state-layer"
              )}
            >
              <NavIcon kind={item.icon} />
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
