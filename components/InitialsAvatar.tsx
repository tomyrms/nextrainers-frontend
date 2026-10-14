/**
 * Teal circular avatar showing the first letter of the email, uppercased.
 * Shared by the app header (32px, wrapped in a link to /fr/profil) and the
 * profile page (64px, next to the coach's name and email).
 */
export function InitialsAvatar({
  email,
  className = "",
}: {
  email: string;
  className?: string;
}) {
  const initial = email.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-darker ${className}`}
    >
      {initial}
    </span>
  );
}
