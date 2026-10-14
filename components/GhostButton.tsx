import type { ButtonHTMLAttributes } from "react";

type GhostButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Secondary CTA: translucent fill with a light hairline border.
 */
export function GhostButton({
  className = "",
  children,
  ...props
}: GhostButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-white/30 bg-white/10 px-6 text-base font-semibold text-white backdrop-blur transition-colors hover:bg-white/20 active:scale-[0.97] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
