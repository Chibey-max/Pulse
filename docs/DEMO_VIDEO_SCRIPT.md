# Pulse Demo Video Script

Word-for-word, 2:00 hard cap. Read the bold lines aloud exactly as written; everything
else is stage direction.

Primary URL: https://pulse-session.vercel.app
Evidence page: https://pulse-session.vercel.app/judge

---

## Before you hit record

1. **Confirm the board is alive.** Open `/app` and wait for a market card: pair, `#id`,
   `TRADING`, a countdown, a strike, and order-book rows. If the strike is a dash, wait
   ~30s for the next indexer refetch. If the card is missing entirely, reload — window
   discovery swallows its errors and returns an empty board, and it usually recovers on the
   next attempt. Do not record until you have a card with a strike.
2. **Pick a fresh window and never demo one near zero.** Aim for 15+ minutes left. The
   countdown ticks locally while the market list refetches every 30s, so a resolved window
   keeps its `TRADING` chip and live Call buttons for up to half a minute after it expires —
   and the contract will reject the call. A window inside its last two minutes also drops
   the strike and thins the book on camera.
3. **Warm the session allow-list before recording.** A window that rolled in after the
   session was funded is not in the clone's allow-list, so the first call on it spends an
   extra `addAllowedMarket` transaction (plus a settlement subscription) before the place
   goes through. Place one throwaway call on the window you intend to demo, or simply do
   not place a call on camera — this script does not require one.
4. **Connect the wallet before you record.** The realised/unclaimed strip at the top of
   `/app` takes ~20 seconds to populate after connecting and is not part of this script —
   let it fill while you are still setting up.
5. **Have the verifier ready.** A terminal in the repo, cleared, with `pnpm verify:evidence`
   typed but not yet run.
6. **Record the deployment, not `next dev`.** HMR does a hard reload on save and will drop
   your wallet connection mid-take.

Tabs to open: `/`, `/app`, `/positions`, `/judge`, plus the terminal.

---

## The take — 2:00

Total spoken: 248 words — about 1:40 at a normal pace, 1:50 if you read deliberately.
That leaves 10–20 seconds for clicks and scrolls, which is enough only if you keep the
transitions tight. If you are a slow speaker, cut the optional add-on and do not pause
between beats.

### 0:00–0:15 — Landing (39 words)

_Screen: the landing page, top of the hero._

> **"This is Pulse. Not another prediction market — a session layer on DreamDEX Event
> Contracts. DreamDEX supplies the BTC and ETH up-down windows. Pulse turns them into a
> repeatable product with capped risk and settlement the chain performs itself."**

_Click `Open app`._

### 0:15–0:40 — The live desk (44 words)

_Screen: `/app`. Let the market card land. Point at the market id, the strike, the
countdown, the book. Click a stake chip._

> **"Here's the live desk, reading Shannon testnet directly. Real market ID, real strike,
> real order book, real countdown. I pick a side and a stake. Twenty-five tUSDC in,
> twenty-five is the most I can lose — the cap is enforced before I ever sign."**

### 0:40–1:00 — Session mode (46 words)

_Screen: stay on `/app`, move to the Session panel on the right. Point at vault balance,
windows left, and the rule as you say them._

> **"This is the core: a per-wallet session clone. Three transactions to open it — clone,
> approve, fund. After that the contract enforces the policy: owner, allowed markets, max
> stake, windows remaining. It is not custody and it is not a bot. I still sign every
> call."**

### 1:00–1:35 — The proof (69 words)

_Screen: go to `/judge`. Scroll the hash trail. Open the validator redemption transaction
in the explorer as you reach the third sentence._

> **"Now the part that makes this different. When the window resolves, Somnia validators
> call my session contract through the Reactivity precompile — and the session redeems
> itself. This is that transaction. The selector is `0x53edf33d`, `onEvent`. The caller is
> the precompile at `0x100` — the handler reverts for anyone else. And the nonce is a
> system nonce, not mine. No bot, no cron, no keeper. The chain did it."**

This is the beat that wins or loses the submission. Slow down here. Let the transaction
page sit on screen for a full two seconds before you speak over it.

### 1:35–2:00 — Verifier and close (50 words)

_Screen: the terminal. Press enter on `pnpm verify:evidence`. Let the PASS lines scroll.
Cut back to `/app` on the final sentence._

> **"Don't take my word for it. `pnpm verify:evidence` re-reads all of this from a public
> RPC — no wallet, no gas. Thirteen checks: the callback, the decoded topics, the credited
> amount, the handler guard. All pass. DreamDEX stays the market. Pulse adds the session
> layer and proves settlement on chain."**

_Stop recording on the app, not the terminal._

---

## If you run short

Only if you are under 1:50 — drop it in right after the proof beat. It is the single most
credible thing you can add, because it is the reason the lane was empty:

> **"Two things kept anyone from doing this. The subscription needs thirty-two SOMI on the
> owner, which isn't documented. And the handler signature has to be exactly
> `onEvent(address, bytes32[], bytes)` — guess it, and your contract compiles, subscribes,
> and silently never fires."**

(41 words, ~17 seconds. Only fits if the main take came in at 1:45 or under.)

---

## Contingencies

Say these instead of debugging on camera.

- **Strike shows a dash:** "That's the reference-opening answer still coming from the
  DreamDEX indexer. Pulse shows the fields it can verify rather than inventing one."
- **No market card at all:** stop recording and redeploy. Do not narrate around it — an
  empty board is the one thing a judge will read as broken.
- **A page is slow:** "This is live testnet data, not a mock." Then move on; do not wait on
  it in silence.
- **You want to place a real call and it stalls:** cancel it. "The settlement path is
  already proven on chain — I'm not going to spend the demo on testnet gas."

---

## Do not say

- Do not call Pulse a prediction market, an exchange, or a venue. It is a session layer;
  DreamDEX is the market.
- Do not say "auto-trading", "autopilot", or "the bot". The owner signs every call — the
  claim that wins is validator-invoked _settlement_, not automated _trading_.
- Do not promise the Activity page shows the validator redemption. It cannot: the log
  backfill floors well above that block, so the row is out of reach. `/judge` and the
  verifier carry that evidence.
- Do not read addresses aloud digit by digit. Name the selector and the precompile; let
  the screen carry the rest.

---

## Why this framing wins

Judges score use of the sponsor primitive, technical depth, and whether the thing is real.
This script hits all three in order: Pulse _uses_ DreamDEX rather than competing with it,
it does the one Somnia-native thing almost nobody attempted — a real `ISomniaEventHandler`
invoked by validators through the Reactivity precompile — and it hands over a read-only
verifier so none of it has to be taken on trust.
