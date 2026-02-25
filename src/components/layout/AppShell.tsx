"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  streakCount?: number;
}

export function AppShell({ children, streakCount }: AppShellProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/daily", label: "Today", icon: "&#9728;&#65039;" },
    { href: "/memory", label: "Memory Book", icon: "&#128214;" },
    { href: "/settings", label: "Settings", icon: "&#9881;&#65039;" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/30 border-b border-white/30">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/daily" className="font-serif text-xl text-textprimary">
            Ours
          </Link>
          {streakCount !== undefined && streakCount > 0 && (
            <span className="text-sm text-textsecondary flex items-center gap-1.5">
              {streakCount} day{streakCount !== 1 ? "s" : ""} ✨
            </span>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 z-40 backdrop-blur-md bg-white/40 border-t border-white/30">
        <div className="max-w-lg mx-auto px-4 py-2 flex justify-around">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-xl transition-colors",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "text-rose-dark"
                  : "text-textmuted hover:text-textsecondary"
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
