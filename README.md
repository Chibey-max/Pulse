# Pulse

**Session Layer for DreamDEX Event Contracts on Somnia.**

Pulse turns BTC/ETH Up/Down windows into a capped-risk session flow: connect on
Somnia Shannon, place calls through DreamDEX Event Contracts, keep session funds
inside a per-user clone, and let Somnia Reactivity redeem session-held winning
positions when the market finalizes.

- Live app: https://pulse-session.vercel.app
- Demo video: https://youtu.be/Dm4aPn5rOS0
- Hackathon: Somnia x DreamDEX Event Contracts
- Network: Somnia Shannon testnet, chain id `50312`
- SDK: `@somnia-chain/markets-sdk@0.29.0`
- Reactivity package: `@somnia-chain/reactivity@0.2.1`

## What Pulse Solves

DreamDEX Event Contracts already give users capped-risk BTC/ETH, 15m/1h,
Up/Down markets. The remaining pain is settlement: after a winning or voided
window, the value sits in outcome tokens until the user comes back and redeems.

Pulse adds a session layer:

- **Direct mode:** wallet-held calls plus claim-all for redeemable markets.
- **Session mode:** a per-user `PulseSession` clone holds collateral and
  session positions under onchain policy limits.
- **Reactive settlement:** the session subscribes to `MarketFinalized`; when
  validators invoke `onEvent(address,bytes32[],bytes)` through precompile
  `0x0100`, the session redeems its tracked markets.

There is no new market and no offchain keeper in the settlement path. Pulse sits
on top of DreamDEX Event Contracts.

## Onchain Evidence

The strongest proof is reproducible:

```bash
pnpm verify:evidence
```

That script performs read-only checks against the public Shannon RPC. It verifies
the callback selector, emitted topics, credited amount, implementation bytecode,
and precompile guard for a validator-invoked settlement.

| Item                           | Value                                                                |
| ------------------------------ | -------------------------------------------------------------------- |
| Factory with corrected handler | `0x26d0A38dB17aC44ed91A90d68a3FDD7B366BCE84`                         |
| Current app factory            | `0x7c89D4Ab69F3C7e2e29C08B58407a4EBBa1244E4`                         |
| Session clone                  | `0x5bc72C8fD675D0316c58196ab677E0277f6eF5eA`                         |
| Reactivity subscription tx     | `0xae98302bd2b7dab0fc2f2f92b3f046fae43a80fced6e30773cf81d9eb094baef` |
| Session call tx                | `0xc625de217a699d3538b5bce77d1eb3e5881379a13e6cac5c56eb833712dcccbb` |
| Validator redemption tx        | `0xe9bf34787416a0c46814b717868921a43d07491217b46ad03bd48124b14ef7b2` |
| Handler selector               | `0x53edf33d`                                                         |
| Reactivity precompile          | `0x0000000000000000000000000000000000000100`                         |

Details live in [docs/EVIDENCE.md](docs/EVIDENCE.md).

## Product Surface

- `/` - judge-facing overview with proof-aware copy.
- `/app` - live trading desk for BTC/ETH Event Contract windows.
- `/markets` - all supported live 15m/1h windows; no silent duration fallback.
- `/faucet` - testnet funding station for fake tUSDC collateral.
- `/positions` - wallet-held and session-held positions plus direct claim-all.
- `/activity` - live order history plus session `Redeemed` rows when observed.
- `/session/new` - 3-transaction setup: create clone, approve tUSDC, fund vault,
  followed by settlement subscriptions for allowed markets.
- `/session/[address]` - read-only public session proof surface.

## Contracts

| Contract              | Role                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `PulseSessionFactory` | Deploys one EIP-1167 `PulseSession` clone per owner.                                                                 |
| `PulseSession`        | Holds session collateral, enforces max stake/windows/expiry, places through the adapter, and redeems via Reactivity. |
| `SomniaBinaryAdapter` | Bridges session calls into DreamDEX binary Event Contracts and tracks session-held outcome balances.                 |

The evidence trail is pinned to the corrected factory that deployed the proof
clone above. The live app points at a newer factory with the same corrected
handler plus `rearm()`, so a spent or expired session can be reused instead of
dead-ending the owner's one-session-per-wallet slot.

## Local Run

```bash
nvm use
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000.

Useful checks:

```bash
pnpm verify:evidence
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Environment

`.env.example` contains working Shannon defaults:

- `NEXT_PUBLIC_CHAIN_ID=50312`
- `NEXT_PUBLIC_RPC_URL=https://api.infra.testnet.somnia.network`
- `NEXT_PUBLIC_INDEXER_URL=https://dev.smk.somnia.host/v1/graphql`
- `NEXT_PUBLIC_WS_RPC_URL=wss://api.infra.testnet.somnia.network/ws`
- `NEXT_PUBLIC_SESSION_FACTORY=0x7c89D4Ab69F3C7e2e29C08B58407a4EBBa1244E4`
- `NEXT_PUBLIC_MARKET_ADAPTER=0x6551503d37f739494534f51D5Bbcb3f90077D4f2`
- `NEXT_PUBLIC_BINARY_MODULE_ADDRESS=0x3ecC694Cef705358864a646142ac17A90E29e388`

If local session config looks missing even though `.env.local` is set, check for
blank shell exports such as `NEXT_PUBLIC_SESSION_FACTORY=`. Next reads
`process.env` before `.env.local`, including empty strings.

## Test Status

- Foundry: 15 passing contract tests.
- Vitest: 6 passing client/domain tests.
- Evidence verifier: 11 passing read-only RPC checks.
- Production build: Next.js 16 app builds successfully.

## Honest Scope

Pulse proves session-held automatic redemption through Somnia Reactivity. It does
not claim autonomous trading alpha, price prediction, or contract-level
auto-placement of successor windows. After redemption, the session remains funded
and ready for the owner to place the next capped-risk call.
