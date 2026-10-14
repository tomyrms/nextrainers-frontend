import type { InputHTMLAttributes } from "react";

type AuthFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string };

/** Labeled dark input shared by the auth forms. */
export function AuthField({
  label,
  id,
  className = "",
  ...props
}: AuthFieldProps) {
  return (
    <label className="block text-left" htmlFor={id}>
      <span className="mb-1.5 block text-sm font-medium text-white/70">
        {label}
      </span>
      <input
        id={id}
        className={`h-12 w-full rounded-xl border border-white/10 bg-fill px-4 text-base text-white transition-colors outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:bg-fill-strong ${className}`}
        {...props}
      />
    </label>
  );
}
