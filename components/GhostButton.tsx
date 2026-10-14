import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type GhostButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** When set, the CTA renders as a `next/link` anchor with the same classes. */
  href?: string;
};

/**
 * Secondary CTA: translucent fill with a light hairline border.
 */
export function GhostButton({
  className = "",
  children,
  href,
  ...props
}: GhostButtonProps) {
  const classes = `inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 active:scale-[0.97] ${className}`;

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
