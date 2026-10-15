/**
 * Server + browser helpers for the notification inbox (contract §9).
 *
 * Reads are fail-soft (`null` inbox when the API is unreachable), mutations
 * run in the browser against the public API URL and resolve to a boolean.
 */

export interface InboxNotification {
  id: string;
  title: string;
  body: string;
  /** ISO timestamp */
  createdAt: string;
  /** ISO timestamp, or null while unread */
  readAt: string | null;
  /** Original-app deep link, e.g. "/trainings/tr_007" */
  path?: string | null;
}

export interface Inbox {
  notifications: InboxNotification[];
  unreadCount: number;
}

// --- Server-side reads -----------------------------------------------------

/** `GET /api/notifications/inbox` — `null` when the API is unreachable. */
export async function getInbox(): Promise<Inbox | null> {
  const base = process.env.API_BASE_URL || "http://localhost:4900";
  try {
    const response = await fetch(`${base}/api/notifications/inbox`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<Inbox> | null;
    if (!data || !Array.isArray(data.notifications)) return null;
    const notifications = data.notifications.filter(
      (n): n is InboxNotification =>
        !!n && typeof n.id === "string" && typeof n.title === "string",
    );
    const unreadCount =
      typeof data.unreadCount === "number"
        ? data.unreadCount
        : notifications.filter((n) => !n.readAt).length;
    return { notifications, unreadCount };
  } catch {
    return null;
  }
}

/** "il y a 2 jours" style label relative to `now` (French). */
export function relativeTimeFr(iso: string, now: number): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const seconds = Math.round((time - now) / 1000);
  const format = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return "à l'instant";
}

/**
 * Maps the original app's deep links onto the clone's French routes; `null`
 * when the target has no screen here (the item is then only marked read).
 */
export function cloneRoute(path: string | null | undefined): string | null {
  if (!path || !path.startsWith("/")) return null;
  if (path.startsWith("/fr/")) return path;
  const rules: [RegExp, (m: RegExpMatchArray) => string][] = [
    [/^\/profile\/?$/, () => "/fr/profil"],
    [/^\/(team|players)\/?$/, () => "/fr/equipe"],
    [/^\/(season|saison)\/?$/, () => "/fr/saison"],
    [/^\/(library|exercises)\/?$/, () => "/fr/bibliotheque"],
    [/^\/(home|dashboard)\/?$/, () => "/fr/accueil"],
    [/^\/analysis\/?$/, () => "/fr/analyses"],
    [/^\/analysis\/([^/?#]+)/, (m) => `/fr/analyses/${m[1]}`],
    [/^\/trainings\/([^/?#]+)/, (m) => `/fr/entrainements/${m[1]}`],
  ];
  for (const [pattern, build] of rules) {
    const match = path.match(pattern);
    if (match) return build(match);
  }
  return null;
}

// --- Browser-side mutations --------------------------------------------------

function mutationBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:4900";
}

/** `PATCH /api/notifications/inbox/:id/read` — true on any 2xx. */
export async function markRead(id: string): Promise<boolean> {
  try {
    const response = await fetch(
      `${mutationBaseUrl()}/api/notifications/inbox/${encodeURIComponent(id)}/read`,
      { method: "PATCH" },
    );
    return response.ok;
  } catch {
    return false;
  }
}

/** `POST /api/notifications/inbox/mark-all-read` — true on any 2xx. */
export async function markAllRead(): Promise<boolean> {
  try {
    const response = await fetch(
      `${mutationBaseUrl()}/api/notifications/inbox/mark-all-read`,
      { method: "POST" },
    );
    return response.ok;
  } catch {
    return false;
  }
}
