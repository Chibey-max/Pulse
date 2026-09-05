// === Types

export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

// === Marketing

/* Header nav is deliberately minimal: Home and FAQ only. */
export const MARKETING_NAV: readonly NavItem[] = [
  { label: "Home", href: "/" },
  { label: "FAQ", href: "/faq" },
];

/* Fuller set for the footer sitemap. */
export const FOOTER_PRODUCT_NAV: readonly NavItem[] = [
  { label: "Home", href: "/" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Security", href: "/#security" },
  { label: "FAQ", href: "/faq" },
  { label: "Open app", href: "/app" },
];

// === App

export const APP_NAV: readonly NavItem[] = [
  { label: "Home", href: "/app" },
  { label: "Markets", href: "/markets" },
  { label: "Faucet", href: "/faucet" },
  { label: "Positions", href: "/positions" },
  { label: "Activity", href: "/activity" },
];

// === External

export const GITHUB_URL = "https://github.com/Chibey-max/Pulse";
export const SOMNIA_URL = "https://somnia.network";
export const DREAMDEX_DOCS_URL = "https://docs.dreamdex.io/trading/event-contracts";
