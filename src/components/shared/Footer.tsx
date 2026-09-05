import Link from "next/link";
import { AppLogo } from "@/components/shared/AppLogo";
import {
  DREAMDEX_DOCS_URL,
  FOOTER_PRODUCT_NAV,
  // GITHUB_URL,
  type NavItem,
  SOMNIA_URL,
} from "@/lib/nav";
import { SITE } from "@/lib/seo";
import { cn } from "@/lib/cn";

// === Types

export interface FooterProps {
  /* `marketing` renders the full sitemap; `app` renders one compact status line. */
  variant?: "marketing" | "app";
  className?: string;
}

interface FooterColumn {
  title: string;
  items: readonly NavItem[];
}

// === Data

const COLUMNS: readonly FooterColumn[] = [
  { title: "Product", items: FOOTER_PRODUCT_NAV },
  {
    title: "Ecosystem",
    items: [
      { label: "Somnia", href: SOMNIA_URL, external: true },
      { label: "DreamDEX Event Contracts", href: DREAMDEX_DOCS_URL, external: true },
    ],
  },
  {
    title: "Resources",
    items: [
      // { label: "GitHub", href: GITHUB_URL, external: true },
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
];

// === Link

function FooterLink({ item }: { item: NavItem }) {
  const classes =
    "rounded font-mono text-micro uppercase tracking-wider text-text-secondary transition-colors hover:text-up";

  if (item.external) {
    return (
      <a href={item.href} target="_blank" rel="noopener noreferrer" className={classes}>
        {item.label}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={item.href} className={classes}>
      {item.label}
    </Link>
  );
}

// === Component

export function Footer({ variant = "marketing", className }: FooterProps) {
  if (variant === "app") {
    return (
      <footer
        className={cn(
          "max-w-container border-border px-section-px text-micro text-text-muted mx-auto flex w-full flex-col gap-2 border-t py-6 font-mono tracking-wider uppercase sm:flex-row sm:items-center sm:justify-between",
          className,
        )}
      >
        <span className="flex items-center gap-2">
          <AppLogo variant="mark" size="sm" className="text-text-muted" />
          {SITE.name} on Somnia Shannon testnet
        </span>
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className="bg-up size-1.5 rounded-full" />
          Testnet - no real value
        </span>
      </footer>
    );
  }

  return (
    <footer className={cn("panel-deep relative w-full", className)}>
      <div className="max-w-container px-section-px py-section-py-tight mx-auto grid w-full gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <AppLogo variant="full" size="md" />
          <p className="text-caption text-text-secondary max-w-xs">{SITE.tagline}</p>
        </div>

        {COLUMNS.map((column) => (
          <nav key={column.title} aria-label={column.title} className="flex flex-col gap-3">
            <h2 className="text-micro text-text-primary font-mono font-bold tracking-wider uppercase">
              {column.title}
            </h2>
            <ul className="flex flex-col gap-2">
              {column.items.map((item) => (
                <li key={`${column.title}-${item.label}`}>
                  <FooterLink item={item} />
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="max-w-container border-border px-section-px text-micro text-text-muted mx-auto flex w-full flex-col gap-2 border-t py-6 font-mono sm:flex-row sm:items-center sm:justify-between">
        <span>
          &copy; {new Date().getFullYear()} {SITE.name}. MIT licensed.
        </span>
        <span>Capped risk. You can only lose the stake.</span>
      </div>
    </footer>
  );
}
