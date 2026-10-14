import { levelLabel, type Profile } from "@/lib/api-profil";

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

/** "1990-05-01" → "1 mai 1990"; null when unreadable. */
function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return `${Number(match[3])} ${MONTHS[monthIndex]} ${match[1]}`;
}

/**
 * Read-only profile card: the coach fields as uppercase-label rows, "—" when
 * the API hasn't provided one. Server component; the edit form sits below it.
 */
export function ProfileCard({ profile }: { profile: Profile }) {
  const rows: { label: string; value: string | null }[] = [
    { label: "Équipe", value: profile.teamName },
    { label: "Date de naissance", value: formatDate(profile.dateOfBirth) },
    {
      label: "Expérience",
      value:
        profile.experience !== null
          ? `${profile.experience} an${profile.experience > 1 ? "s" : ""}`
          : null,
    },
    { label: "Niveau", value: profile.level ? levelLabel(profile.level) : null },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-white/10 bg-card">
      <dl className="divide-y divide-white/5">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-4 px-4 py-3.5"
          >
            <dt className="shrink-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd className="min-w-0 truncate text-sm font-medium text-foreground">
              {row.value || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
