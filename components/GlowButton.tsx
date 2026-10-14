import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type GlowButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** When set, the CTA renders as a `next/link` anchor with the same classes. */
  href?: string;
};

/**
 * Primary CTA: teal glow surface, dark label, full pill radius.
 * Sizing is left to the caller (e.g. `w-full md:w-80`).
 */
export function GlowButton({
  className = "",
  children,
  href,
  ...props
}: GlowButtonProps) {
  const classes = `glow-primary inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full border border-white/20 px-6 text-base font-semibold text-primary-foreground hover:scale-[1.02] active:scale-[0.97] ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...props}>
      {children}
    </button>
  );
}
