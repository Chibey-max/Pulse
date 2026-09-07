# Pulse Demo Video Script

Target length: 2:30 to 3:00.

Primary URL: https://pulse-session.vercel.app

Evidence fallback: https://pulse-session.vercel.app/judge

## Goal

Make judges understand Pulse in the first 20 seconds:

Pulse is a session layer on DreamDEX Event Contracts. It lets a user place capped-risk BTC/ETH Up/Down calls, keep collateral in an owner-controlled session clone, and have Somnia Reactivity redeem session-held winnings when the market finalizes.

The winning point is not "another prediction market." The winning point is:

> DreamDEX owns the market. Pulse owns the session UX and proves validator-invoked settlement redemption onchain.

## Recording Setup

Record against the deployed site, not `localhost`. `next dev` recompiles on every file
save and the tab then hard-reloads mid-navigation ("Failed to fetch RSC payload"), which
drops the MetaMask connection on camera. The production deployment has no HMR and cannot
do this.

Before recording:

- Open Chrome with MetaMask visible but not covering key UI.
- Use Somnia Shannon testnet, chain id `50312`.
- Use a funded wallet with both STT and tUSDC.
- Hard-reload each tab once (Ctrl+Shift+R) before you hit record, and let `/app` and
  `/activity` finish their first load — session history is read from chain logs and the
  first read is the slow one; it is cached afterwards.
- Open these tabs:
  - `https://pulse-session.vercel.app`
  - `https://pulse-session.vercel.app/app`
  - `https://pulse-session.vercel.app/faucet`
  - `https://pulse-session.vercel.app/activity`
  - `https://pulse-session.vercel.app/judge`
  - Shannon explorer tx: `0xe9bf34787416a0c46814b717868921a43d07491217b46ad03bd48124b14ef7b2`
- Terminal ready in repo with:

```bash
pnpm verify:evidence
```

Do not wait for a live market to resolve during the recording. Show a live call if it works, then use the evidence trace for the settlement proof.

## 2:45 Script

### 0:00-0:15 - Hook

Screen: landing page, then scroll just enough to show the product/proof framing.

Voice:

"This is Pulse, a session layer for DreamDEX Event Contracts on Somnia. DreamDEX already gives us BTC and ETH Up/Down markets. Pulse solves the part that is still painful for repeat users: managing capped-risk calls and redeeming settlement from session-held positions."

### 0:15-0:35 - What It Is

Screen: `/app`, show live BTC/ETH window, countdown, strike, book, Up/Down buttons.

Voice:

"The product uses real DreamDEX Event Contract windows: BTC and ETH, 15 minute and 1 hour, Up or Down. The user picks a side and a stake. Risk is capped at the stake, and the app shows the live window, strike, implied prices, and order book."

Show:

- Pair and window
- Countdown
- Strike
- Market id
- Book
- Up/Down buttons

### 0:35-0:58 - Direct Mode

Screen: place a small direct call if the wallet is ready. If gas or liquidity is flaky, do not spend time debugging; describe the path and continue.

Voice:

"Direct mode is the simplest path: the wallet places a call directly through the DreamDEX SDK. When a position becomes redeemable, Pulse gives the user claim-all instead of forcing them to chase individual markets."

If transaction succeeds:

"This is a normal user-signed trade. It is useful, but it is not the main innovation."

If transaction fails:

"This is a live testnet, so if gas or liquidity moves during recording, the important thing is that Pulse fails visibly and tells the user what to fix. I’ll use the verified trace for the settlement proof."

### 0:58-1:25 - Session Mode

Screen: show session card on `/app`, then optionally `/session/new`.

Voice:

"Session mode is the core. A user gets a per-wallet PulseSession clone. Setup is explicit: create the clone, approve tUSDC, and fund the vault. After that, the clone enforces the policy onchain: budget, max stake per window, expiry, and allowed market ids."

Show:

- Session balance
- Armed/disarmed state
- Windows left
- Rule
- Fund/withdraw/disarm controls

Voice:

"The session is not a custody shortcut and not a hidden trading bot. The owner still controls funds and signs explicit session actions. The session contract enforces limits and holds the position."

### 1:25-1:55 - The Winning Technical Proof

Screen: `/judge`, top proof rail.

Voice:

"Here is the part this hackathon is really about. Pulse subscribes the session to DreamDEX market-finalized events through Somnia Reactivity. When the event resolves, validators invoke the session handler through the Reactivity precompile at `0x0100`. The handler then redeems the session’s tracked outcome tokens."

Click or point at:

- Session subscribed
- User placed a capped call
- Validator redeemed settlement
- Vault stays ready

Voice:

"That separates the two signatures of the product clearly: the user signs the trade intent, and the settlement redemption is invoked by the chain path when the market finalizes."

### 1:55-2:20 - Hash Trail

Screen: `/judge`, hash trail and proof tx links. Open the validator redemption tx.

Voice:

"This is not a mock trace. These are the submitted Shannon addresses and transactions: the factory, the session clone, the Reactivity subscription, the session call, and the validator redemption transaction."

Show these values if possible:

- Factory: `0x26d0A38dB17aC44ed91A90d68a3FDD7B366BCE84`
- Implementation: `0x9a8C9Fceb88BEEBbE50E231674ab5F3C81CC69fe`
- Session clone: `0x5bc72C8fD675D0316c58196ab677E0277f6eF5eA`
- Subscription tx: `0xae98302bd2b7dab0fc2f2f92b3f046fae43a80fced6e30773cf81d9eb094baef`
- Session call tx: `0xc625de217a699d3538b5bce77d1eb3e5881379a13e6cac5c56eb833712dcccbb`
- Validator redemption tx: `0xe9bf34787416a0c46814b717868921a43d07491217b46ad03bd48124b14ef7b2`

Voice:

"The callback selector is `0x53edf33d`, which is `onEvent(address,bytes32[],bytes)`. The session handler rejects any caller except the Reactivity precompile, so this redemption path is enforced onchain."

### Optional beat - Why This Lane Was Empty

Use this if the cut has room. It is the strongest differentiation line available, because
it explains why a validator-invoked handler is rare rather than just asserting Pulse has
one.

Voice:

"Two things make this path easy to get wrong, and neither is documented. A subscription requires the owner to hold 32 SOMI, so it silently fails below that. And the handler has to be `onEvent(address,bytes32[],bytes)` exactly. An `onEvent(bytes)` handler compiles, deploys, and accepts a subscription, then never fires, with no on-chain trace to debug. We hit both, and the repo ships a feedback report documenting them."

### 2:20-2:40 - Verifier

Screen: terminal, run:

```bash
pnpm verify:evidence
```

Voice:

"The repo includes a read-only verifier. Thirteen checks, no wallet, no funds, no gas. It re-reads the public Shannon RPC, decodes the callback payload, checks the emitter and topics, checks the credited amount, confirms the clone delegates to the implementation carrying the correct selector, and checks the handler rejects every caller except the precompile."

Pause on:

"All checks passed. The redemption was invoked by the chain, not the owner."

### 2:40-2:55 - Close

Screen: back to `/app`, show live desk + session card.

Voice:

"Pulse makes Event Contracts feel like a repeatable product instead of a one-window transaction. Direct mode gives claim-all. Session mode gives an owner-controlled vault with onchain policy. Somnia Reactivity gives the settlement path. That is the full loop: place, resolve, redeem, and keep the session ready for the next capped call."

End on the app, not the explorer.

## Short 90-Second Version

Use this if DoraHacks upload or attention span demands a shorter cut.

1. "Pulse is a session layer for DreamDEX Event Contracts on Somnia. It does not create a new market; it makes BTC/ETH Up/Down windows easier to use repeatedly."
2. Show `/app`: "Here are live DreamDEX windows, capped stake, market id, book, and Up/Down calls."
3. Show session card: "Session mode creates an owner-controlled clone. The user funds it, and the clone enforces budget, max stake, expiry, and allowed markets."
4. Show `/judge`: "The key proof is settlement redemption. Pulse subscribes the session to DreamDEX market-finalized events through Somnia Reactivity."
5. Show validator tx: "This validator redemption tx calls the session handler selector `0x53edf33d`. The handler only accepts the Reactivity precompile."
6. Run verifier: "`pnpm verify:evidence` re-checks this from public Shannon RPC. The product is live, the contracts are deployed, and the proof is reproducible."

## What To Avoid Saying

- Do not say Pulse created the underlying market.
- Do not say Pulse predicts prices.
- Do not say the session automatically places future trades by itself.
- Do not say settlement works without evidence unless the handler tx is visible.
- Do not spend more than 20 seconds debugging MetaMask during the video.

## If The Live Call Fails During Recording

Use this line and move on:

"The live testnet path depends on wallet gas and book liquidity. The product handles that visibly, so I’ll switch to the verified onchain trace for the part that matters most: session settlement through Reactivity."

Then go directly to `/judge` and the terminal verifier.

## Winning Framing

End the video with this mental model:

- DreamDEX: event-contract market primitive.
- Pulse Direct: better user redemption for wallet-held positions.
- Pulse Session: owner-controlled clone with capped policy.
- Somnia Reactivity: validator-invoked settlement redemption.
- Evidence: public hashes plus `pnpm verify:evidence`.

One sentence:

> Pulse turns Event Contracts from isolated one-window trades into a repeatable, capped-risk session experience with verifiable onchain settlement redemption.
