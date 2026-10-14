import type { ButtonHTMLAttributes } from "react";

type GlowButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Primary CTA: teal glow surface, dark label, full pill radius.
 * Sizing is left to the caller (e.g. `w-full md:w-80`).
 */
export function GlowButton({ className = "", children, ...props }: GlowButtonProps) {
  return (
    <button
      type="button"
      className={`glow-primary inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full border border-white/20 px-6 text-base font-semibold text-primary-foreground hover:scale-[1.02] active:scale-[0.97] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
