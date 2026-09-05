# SDK & Documentation Feedback

**Project:** Pulse — session layer for DreamDEX Event Contracts
**Hackathon:** Somnia × DreamDEX Event Contracts Hackathon (Sep 2026)
**Network:** Somnia Shannon testnet (chain id `50312`)
**Packages:** `@somnia-chain/markets-sdk@0.29.0`, `@somnia-chain/reactivity@0.2.1`, `viem@2.56.3`

Every item below cost real build time on this project. Each one lists what we
expected, what actually happened, and how we worked around it. Findings are
ordered by how much they cost us.

---

## 1. Reactivity subscriptions require a 32 SOMI owner balance, and nothing says so until you call

**Severity: high — this silently blocks the headline primitive.**

`subscribeRaw()` fails with:

```
Error: Owner balance must be at least 32 SOMI to create a subscription
```

The guard is client-side in `@somnia-chain/reactivity`:

```js
if ((await this.viem.getBalance()) < parseEther("32"))
  return new Error("Owner balance must be at least 32 SOMI to create a subscription");
```

and the precompile at `0x…0100` reverts on a raw `subscribe()` too, so it is a
real protocol rule rather than only an SDK opinion.

Why this hurt: Somnia Reactivity is marketed as the headline primitive, and the
Shannon faucet hands out far less than 32 STT. A hackathon developer can wire the
entire handler path correctly — deploy the handler, get the topic right, get the
selector right — and still never see a single callback, with no on-chain trace to
debug against, because the subscription was never created. We only found the
requirement by calling the function and reading the thrown string.

What would have helped:

- State the minimum balance in the Reactivity docs and in the `subscribeRaw`
  TSDoc, next to `DEFAULT_SUBSCRIPTION_OPTIONS` (which _is_ documented in
  detail, including the 6 gwei fee rule — the balance floor deserves the same).
- Export it as a named constant (`MIN_SUBSCRIPTION_OWNER_BALANCE`) so apps can
  pre-flight it and render "you need N more STT" instead of failing at submit.
- Ideally, have the hackathon faucet issue ≥32 STT on request, since no
  Reactivity submission is possible below that line.

## 2. `eth_getLogs` is capped at 1000 blocks, and `fromBlock: "earliest"` throws

**Severity: high — breaks the obvious first implementation.**

The public RPC (`api.infra.testnet.somnia.network`) rejects any range wider than
1000 blocks:

```
block range exceeds 1000
```

That interacts badly with Somnia's ~100 ms block time: 1000 blocks is roughly
100 seconds of history, so "read my contract's whole event log" — a one-liner on
most chains — needs deliberate chunking here. Our first implementation used
`fromBlock: "earliest"`, which throws outright; because we had wrapped the read
in a `try/catch` that degraded to zero, the UI showed a confident, wrong `0`
instead of an error.

Workaround: binary-search the contract's creation block with `eth_getCode`
(~15 calls, and it stays cheap however old the chain gets), then page the range
in ≤1000-block chunks:

```ts
const CHUNK = 999n;
for (let start = fromBlock; start <= toBlock; start += CHUNK + 1n) { … }
```

What would have helped: document the limit in the RPC/network reference, and
have the SDK expose a chunked log reader, since every consumer of contract
history on this chain has to write the same loop.

## 3. Synthesized market symbols are undocumented, and a hand-built one never matches

**Severity: high — cost us the longest single debugging session.**

`exchange.createOrder(symbol, …)` fails with:

```
InvalidInputError: unknown symbol BTC-15m/0x70a86… — call loadMarkets() first
```

Two separate traps here:

1. **The error text misleads.** It says "call `loadMarkets()` first" even when
   `loadMarkets()` _has_ been called, because the real fault is a symbol the
   registry never contained. We spent a long time re-checking our load path
   before questioning the symbol itself.
2. **The grammar is not guessable.** The canonical binary symbol is
   `ASSET-STRIKE-DDMONYY/QUOTE` (e.g. `BTC-95000-31DEC26/USDC`), synthesized
   deterministically from the market row — with an expiry code, a trimmed
   strike, a currency _code_ (not the collateral address), and a `-xxxx`
   collision suffix. We had built `BTC-15m/<collateralAddress>`, which is
   plausible, wrong, and fails identically to a typo.

Fix that worked: never build the string. Resolve it from the registry, which
also accepts a raw chain ref:

```ts
const { marketSymbol } = exchange.market(marketId);
await exchange.createOrder(`${marketSymbol}#YES`, …);
```

What would have helped: say in the `createOrder` docs that a symbol should be
obtained from `exchange.market(ref)` rather than constructed, and distinguish
"unknown symbol" from "markets not loaded" in the error.

## 4. `getOpenPositionsWithPnL` cannot express realized P&L, and `realizedPnl` misleads

**Severity: medium.**

`getPortfolio` returns only open (non-zero balance) positions, so a redeemed
position — precisely the thing realized P&L exists to describe — has already
disappeared by the time you want to report it. The `realizedPnl` field on the
result compounds this: `computePositionPnL` explicitly ignores redemptions
(`// Redeem: settles the position at payout — no cost-basis change; ignored`),
so it only reflects _sells_. For a hold-to-settlement product like ours, it is
structurally always `0`.

Workaround: fold `getUserFills` (cost basis) against `getRouterActions` filtered
to `kind: "Redeem"` (which does carry the real `payout`), treating a redeem as a
sell at payout — mirroring the SDK's own avg-cost logic.

What would have helped: a `getClosedPositions`/`getRealizedPnL` read, or at
minimum a docs note that `realizedPnl` excludes settlement.

## 5. The `listLiveBinaryMarkets` query intermittently times out

**Severity: medium — looked exactly like an app bug.**

For roughly 40 minutes the `LiveBinaryMarkets` query timed out repeatedly:

```
IndexerError: indexer LiveBinaryMarkets failed: The operation was aborted due to timeout
```

while `getOrders`, `getClaimable` and a plain `{__typename}` probe on the same
indexer all answered in under a second. A raw GraphQL query with the same
`expiry > now` predicate also timed out, so it appears specific to that filter's
query plan rather than to general indexer health.

Because this is the query behind the market board, the whole app reads as broken
during the episode. We lost real time deciding whether it was our regression.

What would have helped: a status page or a documented degradation mode, and a
tighter default timeout with a typed "indexer degraded" error apps can render
distinctly from "no markets".

## 6. Market cadences in practice are wider than the docs list

**Severity: low, but it changes product scope.**

The docs describe 15m and 1h windows. Live on Shannon we observed `1m`, `5m`,
`15m`, `1h`, `4h`, `24h` and `1080h` markets trading simultaneously. We had
hard-filtered to `15m`/`1h`, so our board showed "No live windows" during
stretches when plenty of markets were live — a self-inflicted bug, but one the
docs invited.

Related: at one point _no_ 15m or 1h window was live at all while 4h/24h were,
so any app hard-coding the documented pair should expect genuine empty periods.

## 7. `MarketFinalized` has two ABI shapes sharing one name

**Severity: low, but a real footgun for event filters.**

`eventsAbi` exports two different `MarketFinalized` definitions:

- `MarketFinalized(bytes32 indexed marketId, address indexed pool, uint256 marketKey)`
- `MarketFinalized(uint256 indexed marketKey, …)`

Only the first puts `marketId` in `topic1`. A Reactivity filter built against
the wrong one silently never matches — and a never-matching subscription is
indistinguishable from a broken handler, since neither produces any trace.
Worth disambiguating the names, or documenting which one the binary module
actually emits.

## 8. Smaller notes

- **Adapter-derived quantities need lot alignment.** `quantity = stake × ONE_COLLATERAL / price`
  does not land on the pool's `lotSize`, and the pool rejects unaligned
  quantities. Every integrator computing a quantity from a stake has to read
  `getOrderBookParameters()` and round down first; a helper would save that.
- **Thin books are the norm.** We repeatedly observed live windows with zero
  trades, which makes any IOC-based demo flow fragile. Worth calling out in the
  docs so builders design for partial and zero fills from the start.
- **`estPayoutFor` is exactly the right shape** — payout, void-at-half and
  fee-skim handled in one place. More derived helpers at this level (a realized
  P&L fold, a lot-aligner) would remove most of the arithmetic we had to write.

---

## What worked well

Credit where due: `listLiveBinaryMarkets`, `getBinaryOrderBook`, `getClaimable`
and `getMarketOnchain` were accurate and pleasant, and `getMarketOnchain` in
particular was the single most reliable read in the SDK — chain-truth for
status, `winningOutcome`, `isVoided` and `finalized` in one call, independent of
indexer state. The TSDoc on `chains/definitions` and `DEFAULT_SUBSCRIPTION_OPTIONS`
is unusually good; the gaps above are mostly places where that same standard
had not yet been applied.
