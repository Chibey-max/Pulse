# Pulse

Prediction-market session app on Somnia. Next.js frontend plus Foundry contracts and a Somnia
markets adapter.

## Requirements

- Node `>=20.9` (repo pins `24` via `.nvmrc`)
- pnpm `>=9` (`corepack enable` will provide it)
- [Foundry](https://book.getfoundry.sh/getting-started/installation) for the contract workflow

## Setup

```bash
nvm use
corepack enable
pnpm install
cp .env.example .env.local   # fill in the blanks
```

## Scripts

| Script                              | What it does                                            |
| ----------------------------------- | ------------------------------------------------------- |
| `pnpm dev`                          | Start the Next.js dev server on `http://localhost:3000` |
| `pnpm build`                        | Production build                                        |
| `pnpm start`                        | Serve the production build                              |
| `pnpm lint` / `pnpm lint:fix`       | ESLint over the repo                                    |
| `pnpm typegen`                      | Generate Next.js route/layout types                     |
| `pnpm typecheck`                    | `next typegen` then `tsc --noEmit`                      |
| `pnpm format` / `pnpm format:check` | Prettier over the repo                                  |
| `pnpm test`                         | Contract tests then client tests                        |
| `pnpm test:client`                  | Vitest                                                  |
| `pnpm test:contracts`               | `forge test`                                            |
| `pnpm deploy:test`                  | Deploy the session factory to the configured RPC        |

## Tooling

- **ESLint 9** flat config (`eslint.config.mjs`), Next core-web-vitals + TypeScript rules, with
  `eslint-config-prettier` last.
- **Prettier** (`.prettierrc`) with the Tailwind plugin. Solidity is left to `forge fmt`
  (`[fmt]` in `foundry.toml`).
- **Husky + lint-staged**: `pre-commit` validates the branch name and runs lint-staged;
  `pre-push` re-validates the branch, type-checks, lints, and runs `forge fmt --check` +
  `forge test` when `forge` is on `PATH`.
- Branch names must be `main`, `develop`, or `<type>/<topic>` (`feat|feature|fix|chore|docs|refactor|perf|style|test|hotfix`).
- `.editorconfig`, `.nvmrc`, and `.vscode/` (settings, recommended extensions, debug configs)
  round out the editor setup.

## Frontend

Next.js App Router under `src/`:

```
src/app/(marketing)/   landing page, /faq, /terms, /privacy   (no wallet stack)
src/app/(app)/         /app, /markets, /market/[id], /positions, /activity,
                       /session/new, /session/[address]        (wallet + query providers)
src/components/ui/     Section, CtaButton, CtaLink, Faq, Card, Countdown, StatusChip, Reveal
src/components/shared/ Navbar, NavigationBar, Footer, AmbientBackground, ThemeToggle, WalletButton
src/components/marketing/  landing sections (Hero, PulseTimeline, ...)
src/components/app/    HeroCard, ActionRow, MiniBook, SessionCard, ActivityTape, ...
src/lib/               design tokens live in app/globals.css; cn, seo, nav, faqs, motion/
src/lib/app-data/      TanStack Query hooks over the live Somnia testnet data source
```

- Design tokens (colour, spacing, type scale) are defined once in `src/app/globals.css`
  under `@theme`, with light and dark values. Call sites use tokens, not raw values.
- The app is live-only on Somnia Shannon. It reads live markets/books/portfolio
  data from the SDK + indexer and session state from the deployed Pulse contracts.
- Wallet connect is a small custom control over `wagmi` (no RainbowKit), in
  `src/components/shared/WalletButton.tsx`.

## Contracts

Foundry project rooted at the repo (`src = "contracts"`, `test`, `scripts`). `forge-std` is
vendored in `lib/`.
