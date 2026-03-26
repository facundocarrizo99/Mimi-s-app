"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  streakCount?: number;
  coupleId?: string;
}

export function AppShell({ children, streakCount, coupleId }: AppShellProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/couples", matchPath: "/couples", label: "Spaces", icon: "&#128149;" },
    { href: coupleId ? `/daily?couple=${coupleId}` : "/couples", matchPath: "/daily", label: "Today", icon: "&#9728;&#65039;" },
    { href: coupleId ? `/past-days?couple=${coupleId}` : "/couples", matchPath: "/past-days", label: "Past Days", icon: "&#128218;" },
    { href: "/settings", matchPath: "/settings", label: "Settings", icon: "&#9881;&#65039;" },
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
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl transition-colors text-center min-w-16",
                pathname === item.matchPath || pathname.startsWith(item.matchPath + "/")
                  ? "text-[var(--md-sys-color-primary)] bg-[var(--md-sys-color-primary)]/10"
                  : "text-textmuted hover:text-textsecondary md3-state-layer"
              )}
            >
              <span
                className="text-lg"
                dangerouslySetInnerHTML={{ __html: item.icon }}
              />
              <span className="text-xs">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
