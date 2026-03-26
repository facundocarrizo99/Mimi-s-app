"use client";

import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-full font-medium tracking-[0.01em] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99]";

  const variants = {
    primary:
      "bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.2)] hover:brightness-110",
    secondary:
      "bg-[var(--md-sys-color-secondary-container)] text-[var(--color-textprimary)] border border-[var(--md-sys-color-outline-variant)]/40 hover:brightness-105",
    ghost:
      "text-[var(--color-textsecondary)] hover:bg-[var(--md-sys-color-primary)]/10",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-7 py-3 text-base",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}
