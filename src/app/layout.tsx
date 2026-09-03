import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { BASE_KEYWORDS, SITE } from "@/lib/seo";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

/*
  Fonts are self-hosted from the @fontsource-variable packages rather than next/font/google,
  which needs to reach fonts.googleapis.com at build time. Self-hosting removes that network
  dependency, works offline, and avoids the third-party request.

  Space Grotesk is the display and body face (a distinctive grotesk, per the design brief).
  Inter is the neutral body alternative: switch `--font-sans` in globals.css to
  `var(--font-inter)` to swap the whole body voice in one line. JetBrains Mono carries
  prices, countdowns, market IDs, and transaction hashes.
*/
const spaceGrotesk = localFont({
  src: "../../node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2",
  weight: "300 700",
  variable: "--font-space-grotesk",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const inter = localFont({
  src: "../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});

const jetbrainsMono = localFont({
  src: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
  variable: "--font-jetbrains-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "monospace"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name}: ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  keywords: [...BASE_KEYWORDS],
  applicationName: SITE.name,
  authors: [{ name: SITE.author }],
  creator: SITE.author,
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0e17" },
    { media: "(prefers-color-scheme: light)", color: "#f7f7f4" },
  ],
};

/*
  Root layout: document shell only. The (marketing) and (app) route groups each add
  their own chrome and providers, so the marketing bundle never pulls in the wallet
  stack and the app bundle never pulls in the heavier marketing motion code.

  `class="dark"` is the pre-hydration default; next-themes takes over on mount.
*/
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`dark ${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="text-text-primary flex min-h-svh flex-col font-sans antialiased">
        <ThemeProvider>
          <a href="#main" className="skip-link sr-only">
            Skip to main content
          </a>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
