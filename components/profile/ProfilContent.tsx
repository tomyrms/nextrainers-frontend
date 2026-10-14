import { InitialsAvatar } from "@/components/InitialsAvatar";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { ProfileCard } from "@/components/profile/ProfileCard";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { SignedOutPrompt } from "@/components/profile/SignedOutPrompt";
import { getSessionUser } from "@/lib/api-auth";
import { getProfile } from "@/lib/api-profil";

/**
 * Session-dependent region of /fr/profil, streamed behind a `<Suspense>`
 * boundary (the cookie read is request-time data under Cache Components).
 * Signed out it shows the prompt card; signed in it shows the coach's
 * identity plus the profile card, edit form and sign-out affordances.
 */
export async function ProfilContent() {
  const [user, profile] = await Promise.all([getSessionUser(), getProfile()]);
  if (!user) return <SignedOutPrompt />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <InitialsAvatar email={user.email} className="size-16 text-2xl" />
        <div className="min-w-0">
          <h2 className="truncate text-xl font-bold">
            {profile.fullName ?? "Coach"}
          </h2>
          <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <ProfileCard profile={profile} />

      <ProfileEditForm profile={profile} />

      <LogoutButton />
    </div>
  );
}
