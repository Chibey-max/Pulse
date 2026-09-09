# DoraHacks Submission Copy

Use this as the paste sheet for the Somnia x DreamDEX Event Contracts submission.

---

# ▼ DETAILS FIELD — PASTE EVERYTHING BETWEEN THE TWO RULES ▼

The "Details" step is one free-form Markdown editor. Paste the whole block below into it,
then replace the demo-video line with your uploaded link.

---

## Pulse — a session layer on DreamDEX Event Contracts

Pulse is not a new prediction market. DreamDEX Event Contracts supply the BTC and ETH
Up/Down windows; Pulse adds the product layer around them — capped-risk calls, an
owner-controlled session vault with on-chain policy limits, and settlement that the chain
performs on its own.

**Live app:** https://pulse-session.vercel.app
**Evidence page:** https://pulse-session.vercel.app/judge
**Repo:** https://github.com/Chibey-max/Pulse
**Demo video:** https://youtu.be/Dm4aPn5rOS0

---

### The part worth checking first: settlement is invoked by validators, not by us

A Pulse session subscribes to DreamDEX `MarketFinalized` events through Somnia Reactivity.
When a window resolves, Somnia validators call the session contract through the Reactivity
precompile at `0x0000000000000000000000000000000000000100`, and the session redeems its own
winning position. No keeper, no cron job, no backend worker.

This transaction is the proof:

`0xe9bf34787416a0c46814b717868921a43d07491217b46ad03bd48124b14ef7b2`

Three independent facts make it un-fakeable:

1. It calls selector `0x53edf33d` — `onEvent(address,bytes32[],bytes)`, the
   `ISomniaEventHandler` entry point — with decoded topics naming the DreamDEX binary
   markets module and the exact market that was traded.
2. `onEvent` reverts unless `msg.sender` is the Reactivity precompile. It did not revert;
   it emitted `Redeemed` and credited **20.202 tUSDC** to the vault.
3. The transaction carries a **system nonce** (`8067032289378313`), not an account nonce.
   No externally-owned account produced it.

### Verify it yourself in one command

The repo ships a read-only verifier. No wallet, no funds, no gas — it re-reads everything
from a public Shannon RPC:

```bash
pnpm verify:evidence
```

13 checks: the callback selector, the decoded event topics, the credited amount, the
precompile guard, and that the clone delegates to the implementation that actually served
the redemption. It exits non-zero if any claim stops being true.

### The hash trail

| What                            | Address / tx                                                         |
| ------------------------------- | -------------------------------------------------------------------- |
| Session factory (live app)      | `0x7c89D4Ab69F3C7e2e29C08B58407a4EBBa1244E4`                         |
| Session implementation          | `0xBE2aaEED50938463A8D79F44CeaEc6892176c2F7`                         |
| Factory in the evidence trail   | `0x26d0A38dB17aC44ed91A90d68a3FDD7B366BCE84`                         |
| Session clone used in the proof | `0x5bc72C8fD675D0316c58196ab677E0277f6eF5eA`                         |
| DreamDEX binary markets module  | `0x3ecC694Cef705358864a646142ac17A90E29e388`                         |
| Reactivity precompile           | `0x0000000000000000000000000000000000000100`                         |
| Reactivity subscription tx      | `0xae98302bd2b7dab0fc2f2f92b3f046fae43a80fced6e30773cf81d9eb094baef` |
| Owner-signed session call tx    | `0xc625de217a699d3538b5bce77d1eb3e5881379a13e6cac5c56eb833712dcccbb` |
| Validator-invoked redemption tx | `0xe9bf34787416a0c46814b717868921a43d07491217b46ad03bd48124b14ef7b2` |

The evidence trail names an earlier factory on purpose: it deployed the immutable clone
that served the redemption above, so the verifier checks the contracts the transaction
actually touched. The live app runs on a newer factory whose sessions can be re-armed.

### What the app does

**Live desk.** Real DreamDEX BTC/ETH 15m and 1h windows on Somnia Shannon — market id,
strike, countdown, live order book. Nothing is mocked; when the indexer has not answered
yet, Pulse shows a blank field rather than inventing a number.

**Capped calls.** Pick a side and a stake. The maximum loss is the stake, and the cap is
enforced by the contract before anything is signed.

**Session mode.** Three transactions deploy and fund a per-wallet `PulseSession` clone
(an EIP-1167 minimal proxy). After that the clone enforces the policy on-chain: owner-only
actions, an allowed-market list, max stake per window, a window budget, and an expiry.
It is not custody and it is not a trading bot — the owner signs every call; the contract
only constrains what a call is allowed to be.

**Positions and activity.** Wallet-held and session-held positions across open, locked,
unclaimed and claimed, with a claim-all path for direct positions, plus an activity feed
read from real on-chain logs.

### Design decisions a judge might probe

- **Windows roll; allow-lists should not strand you.** A window created after a session was
  funded is not in its allow-list, so Pulse detects that and extends the list plus
  subscribes the new window to settlement before placing — surfaced in the UI, not hidden.
- **A spent session is recoverable.** `rearm(uint64,uint32)` refreshes the expiry and window
  budget of an expired or disarmed session, while `maxStakePerWindow` and the rule stay
  immutable for the life of the clone — so the risk cap remains a real guarantee.
- **Somnia produces ~864,000 blocks a day.** Log reads are chunked to the RPC's 1000-block
  ceiling with bounded concurrency and a persisted cache, because a naive "scan from
  creation" freezes the browser tab within a day of deployment.

### What made this path hard

Two undocumented things gate a working Reactivity handler, and both fail silently:

1. Creating a subscription requires at least **32 SOMI** on the owner account.
2. The handler signature must be exactly `onEvent(address,bytes32[],bytes)`. A guessed
   signature compiles, deploys, subscribes successfully — and then simply never fires,
   with no error anywhere to explain why.

Findings from working through this are written up in `docs/SDK-FEEDBACK.md` in the repo.

### Stack

Next.js 16 (App Router) · React 19 · TypeScript · wagmi 3 · viem 2 ·
`@somnia-chain/markets-sdk@0.29.0` · `@somnia-chain/reactivity@0.2.1` · Solidity 0.8.30 ·
Foundry · Somnia Shannon testnet (chain id `50312`)

20 contract tests and 12 client tests pass; the evidence verifier is part of the same gate.

---

# ▲ END OF DETAILS FIELD BLOCK ▲

---

## Profile

**BUIDL project name**

Pulse

**Logo**

Upload `public/pulse-buidl-logo.png`.

**Vision**

Pulse is a noncustodial session layer for DreamDEX Event Contracts on Somnia.
DreamDEX already supplies BTC/ETH Up/Down event windows; Pulse makes them easier
to use repeatedly by adding capped-risk wallet flows, per-user session vaults,
claim-all for direct positions, and validator-invoked session settlement through
Somnia Reactivity.

**Category**

Crypto / Web3

**GitHub/GitLab/Bitbucket**

https://github.com/Chibey-max/Pulse

**Project website**

https://pulse-session.vercel.app

**Demo video**

Paste your final uploaded video link here.

**Social link**

Paste your X/Twitter, Farcaster, LinkedIn, or team profile link here.

## Details

**Tagline**

Session Layer for DreamDEX Event Contracts.

**Short description**

Pulse wraps DreamDEX BTC/ETH Up/Down Event Contracts with a cleaner product
surface: direct wallet calls, session-held calls with onchain policy limits, and
Reactivity-powered redemption after market finalization.

**Long description**

Pulse does not create a new market. It uses DreamDEX Event Contracts as the
market layer and adds the missing session experience around them.

Users can connect on Somnia Shannon testnet, view live BTC/ETH 15m and 1h
windows, place capped-risk Up/Down calls, and see their wallet and session
positions. In Direct mode, positions stay in the wallet and Pulse provides a
claim-all path for redeemable markets. In Session mode, Pulse deploys a
per-wallet `PulseSession` clone, funds it with test tUSDC, and enforces policy
limits onchain: owner-only actions, allowed markets, max stake, window count,
and expiry.

The sponsor-specific proof is settlement. A session subscribes to DreamDEX
`MarketFinalized` events through Somnia Reactivity. When the market resolves,
validators invoke `onEvent(address,bytes32[],bytes)` through the Reactivity
precompile at `0x0000000000000000000000000000000000000100`, and the session
redeems its tracked winning position. The submitted repo includes a read-only
verifier, `pnpm verify:evidence`, that re-checks the public transaction trail
from Shannon RPC.

The live app uses the rearm-capable session factory
`0x7c89D4Ab69F3C7e2e29C08B58407a4EBBa1244E4`. The evidence verifier is pinned to
the earlier corrected factory `0x26d0A38dB17aC44ed91A90d68a3FDD7B366BCE84`
because that factory deployed the immutable clone used in the validator
redemption proof.

**Problem solved**

Event Contract users should not have to babysit every resolved window. Pulse
keeps the original DreamDEX market intact, but adds session policy, bounded
risk, direct claim-all, and a proved reactive settlement path for session-held
positions.

**What makes it different**

- Built on DreamDEX Event Contracts instead of replacing them.
- Uses Somnia Reactivity for validator-invoked settlement, not an offchain
  keeper.
- Includes a public evidence page and a read-only verifier for the proof trail.
- Keeps user control: the owner signs calls, and the session contract enforces
  limits.

**Tech stack**

- Next.js 16.3.4, React 19, TypeScript
- wagmi 3, viem 2
- `@somnia-chain/markets-sdk@0.29.0`
- `@somnia-chain/reactivity@0.2.1`
- Solidity / Foundry
- Somnia Shannon testnet, chain id `50312`

## Submission / Proof Links

**Live app**

https://pulse-session.vercel.app

**Judge evidence page**

https://pulse-session.vercel.app/judge

**Repository**

https://github.com/Chibey-max/Pulse

**Current live app factory**

`0x7c89D4Ab69F3C7e2e29C08B58407a4EBBa1244E4`

**Evidence factory**

`0x26d0A38dB17aC44ed91A90d68a3FDD7B366BCE84`

**Session clone used in proof**

`0x5bc72C8fD675D0316c58196ab677E0277f6eF5eA`

**Reactivity subscription tx**

`0xae98302bd2b7dab0fc2f2f92b3f046fae43a80fced6e30773cf81d9eb094baef`

**Session call tx**

`0xc625de217a699d3538b5bce77d1eb3e5881379a13e6cac5c56eb833712dcccbb`

**Validator-invoked redemption tx**

`0xe9bf34787416a0c46814b717868921a43d07491217b46ad03bd48124b14ef7b2`

**Verification command**

```bash
pnpm verify:evidence
```

## Contact

Fill these with your preferred submission details:

- Team lead name:
- Email:
- Telegram/Discord:
- X/Twitter:

## Final Checklist

- Upload `public/pulse-buidl-logo.png`.
- Use Crypto / Web3 as the category.
- Paste the public GitHub repo.
- Paste the live app URL.
- Paste the demo video link after upload.
- Include the `/judge` link in the description or submission notes.
- Mention `pnpm verify:evidence` as the reproducible proof command.
