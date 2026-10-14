import Link from "next/link";
import {
  CalendarRange,
  FolderOpen,
  House,
  Plus,
  Users,
  type LucideIcon,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: LucideIcon;
  href?: string;
}

const ITEMS: NavItem[] = [
  { label: "Accueil", icon: House, href: "/fr/accueil" },
  { label: "Saison", icon: CalendarRange, href: "/fr/saison" },
  { label: "Bibliothèque", icon: FolderOpen, href: "/fr/bibliotheque" },
  { label: "Équipe", icon: Users },
];

const ITEM_BASE =
  "flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 py-2 transition-opacity duration-300";

/**
 * Fixed bottom navigation, 5 slots with the teal "create" action in the middle.
 * Only `Accueil` is wired to a route for now; the others are inert affordances.
 */
export function BottomNav({ active = "Accueil" }: { active?: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-white/15 bg-background/70 pt-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(0,0,0,0.25)] backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto grid w-full max-w-[480px] grid-cols-5">
        {ITEMS.slice(0, 2).map((item) => (
          <NavEntry key={item.label} item={item} active={active} />
        ))}

        <button
          type="button"
          aria-label="Créer"
          className={ITEM_BASE}
        >
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-darker transition-transform duration-300 ease-out hover:scale-105">
            <Plus className="size-6" />
          </span>
        </button>

        {ITEMS.slice(2).map((item) => (
          <NavEntry key={item.label} item={item} active={active} />
        ))}
      </div>
    </nav>
  );
}

function NavEntry({ item, active }: { item: NavItem; active: string }) {
  const isActive = item.label === active;
  const Icon = item.icon;

  const content = (
    <>
      <Icon className={`size-5 ${isActive ? "fill-current" : ""}`} />
      <span
        className={`text-[11px] font-semibold ${isActive ? "" : "text-muted-foreground"}`}
      >
        {item.label}
      </span>
    </>
  );

  const className = `${ITEM_BASE} ${isActive ? "text-primary" : "text-foreground"}`;

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className}>
      {content}
    </button>
  );
}
