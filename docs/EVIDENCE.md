# Evidence: a settlement redemption nobody signed

Somnia Reactivity lets validators invoke a contract directly when a subscribed
event fires. Pulse uses it for the one thing Event Contracts make tedious:
redeeming a winning window. This file is the on-chain trail for a single
settlement where the winnings arrived on their own.

**Network:** Somnia Shannon testnet (chain id `50312`)
**Explorer:** https://shannon-explorer.somnia.network

Every hash below is independently verifiable. No wallet, funds or gas required —
a judge can paste them into the explorer, or run `pnpm verify:evidence`.

---

## The claim, in one line

> A validator called `PulseSession.onEvent` and credited **20.202 tUSDC** to the
> session vault. The owner signed nothing at settlement.

## The trail

| #   | What                                                        | Hash / address                                                                                                                                                                        |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Session factory (corrected handler)                         | [`0x26d0a38db17ac44ed91a90d68a3fdd7b366bce84`](https://shannon-explorer.somnia.network/address/0x26d0a38db17ac44ed91a90d68a3fdd7b366bce84)                                            |
| 2   | Session vault (EIP-1167 clone)                              | [`0x5bc72C8fD675D0316c58196ab677E0277f6eF5eA`](https://shannon-explorer.somnia.network/address/0x5bc72C8fD675D0316c58196ab677E0277f6eF5eA)                                            |
| 3   | Reactivity subscription created (id `16329948`)             | [`0xae98302bd2b7dab0fc2f2f92b3f046fae43a80fced6e30773cf81d9eb094baef`](https://shannon-explorer.somnia.network/tx/0xae98302bd2b7dab0fc2f2f92b3f046fae43a80fced6e30773cf81d9eb094baef) |
| 4   | Call placed — 20,202,000 contracts UP, stake 19.99998 tUSDC | [`0xc625de217a699d3538b5bce77d1eb3e5881379a13e6cac5c56eb833712dcccbb`](https://shannon-explorer.somnia.network/tx/0xc625de217a699d3538b5bce77d1eb3e5881379a13e6cac5c56eb833712dcccbb) |
| 5   | **Validator-invoked redemption — 20.202 tUSDC credited**    | [`0xe9bf34787416a0c46814b717868921a43d07491217b46ad03bd48124b14ef7b2`](https://shannon-explorer.somnia.network/tx/0xe9bf34787416a0c46814b717868921a43d07491217b46ad03bd48124b14ef7b2) |

Market: `0x0000000000000000000000000000000000000000000000000000000000014985`
(ETH 1h). Resolved `winningOutcome = 0` (UP) — the side the session held.

## Why transaction 5 could not have been signed by the owner

The owner sent transactions 3 and 4. Transaction 5 is different, and three
independent facts show it:

**1. The calldata is the protocol's handler callback.** Its selector is
`0x53edf33d` — `onEvent(address,bytes32[],bytes)`, the signature
`@somnia-chain/reactivity` publishes as `SomniaEventHandlerABI`. Decoded, it
carries the matched log verbatim:

```
emitter : 0x3ecC694Cef705358864a646142ac17A90E29e388   (binary markets module)
topic0  : 0x8f396ac6…006e08                            (MarketFinalized)
topic1  : 0x…014985                                    (this market)
topic2  : 0x…6dd98caeac8d5f331396420b79f2f2c781655c65  (the pool)
```

Nothing in the app constructs that payload. Only the precompile does.

**2. `onEvent` rejects every caller except the precompile.** The first statement
in the function is:

```solidity
if (msg.sender != SOMNIA_REACTIVITY_PRECOMPILE) revert OnlyReactivityPrecompile();
```

Transaction 5 succeeded (`status: 1`) and emitted `Redeemed`. Had any account
other than `0x…0100` made that call, it would have reverted and emitted nothing.
So `msg.sender` was the precompile. This is covered by
`testOnEventOnlyAcceptsReactivityPrecompile`.

**3. The nonce is not an account nonce.** Transaction 5 carries
`nonce: 8067032289378313`. The owner's account nonce at that block was ~56. This
is a system-produced transaction; the owner address appears as `from` because a
subscription owner funds its own callback gas — the same reason the precompile
requires a 32 SOMI owner balance before it will accept a subscription at all.

## What happened inside that one transaction

Seven logs, in order — the whole settlement, unattended:

1. Outcome tokens burned on the ERC-6909 singleton `0xb52c5934…f755b9`
2. Settlement `0xbf4a49e0…e6ed23` releases 20,202,000 units of collateral
3. Module `0x3ecC694C…29e388` records the redemption for market `0x…014985`
4. tUSDC transferred to the adapter `0x6551503d…77D4f2`
5. tUSDC transferred adapter → session `0x5bc72C8f…eF5eA`
6. `Redeemed(marketId: 0x…014985, credited: 20202000)` emitted by the session

Session vault balance afterwards: **60.606060 tUSDC** (60.0 deposited + 20.202
redeemed − 19.99998 staked).

## Reproducing it

```bash
pnpm verify:evidence      # read-only; no wallet, no funds, no gas
```

The script re-reads every hash above from a public RPC and re-checks each claim:
that the callback selector is `0x53edf33d`, that the decoded emitter and topics
match the market, that `Redeemed` carries `credited = 20202000`, and that the
market resolved to the side the session held.

## Honest scope

- One settlement, on testnet. It is a proof that the mechanism works
  end-to-end, not a record of sustained operation.
- The position won. A losing window would have emitted `Redeemed` with
  `credited = 0`; the handler still fires, there is simply nothing to pay out.
- Getting here required a 32 SOMI owner balance and the exact handler signature.
  Both are undocumented; see [SDK-FEEDBACK.md](./SDK-FEEDBACK.md), items 1 and 9.
