import {
  createReactivity,
  unwrap,
  DEFAULT_SUBSCRIPTION_OPTIONS,
} from "@somnia-chain/markets-sdk/reactivity";
import type { SomniaMarkets } from "@somnia-chain/markets-sdk";
import type { Address, Hex, WalletClient } from "viem";
import { zeroAddress } from "viem";
import { SOMNIA_REACTIVITY_PRECOMPILE } from "./chain";
import type { SessionPolicyInput, SessionRule } from "./types";

export const pulseSessionFactoryAbi = [
  {
    type: "function",
    name: "sessionOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "session", type: "address" }],
  },
  {
    type: "function",
    name: "createSession",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "policy",
        type: "tuple",
        components: [
          { name: "maxStakePerWindow", type: "uint256" },
          { name: "maxWindows", type: "uint32" },
          { name: "expiry", type: "uint64" },
          { name: "rule", type: "uint8" },
        ],
      },
      { name: "allowedMarketIds", type: "bytes32[]" },
    ],
    outputs: [{ name: "session", type: "address" }],
  },
] as const;

export const pulseSessionAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "policy",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "maxStakePerWindow", type: "uint256" },
      { name: "maxWindows", type: "uint32" },
      { name: "expiry", type: "uint64" },
      { name: "rule", type: "uint8" },
    ],
  },
  {
    type: "function",
    name: "armed",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "windowsUsed",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint32" }],
  },
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "allowedMarket",
    stateMutability: "view",
    inputs: [{ name: "marketId", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "addAllowedMarket",
    stateMutability: "nonpayable",
    inputs: [{ name: "marketIds", type: "bytes32[]" }],
    outputs: [],
  },
  {
    type: "function",
    name: "place",
    stateMutability: "nonpayable",
    inputs: [
      { name: "marketId", type: "bytes32" },
      { name: "side", type: "uint8" },
      { name: "stake", type: "uint256" },
    ],
    outputs: [{ name: "orderId", type: "bytes32" }],
  },
  {
    type: "function",
    name: "disarm",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "event",
    name: "Placed",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "side", type: "uint8", indexed: false },
      { name: "stake", type: "uint256", indexed: false },
      { name: "orderId", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Redeemed",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "credited", type: "uint256", indexed: false },
    ],
  },
  { type: "error", name: "NotOwner", inputs: [] },
  { type: "error", name: "MarketNotAllowed", inputs: [{ name: "marketId", type: "bytes32" }] },
  { type: "error", name: "MarketNotTrading", inputs: [{ name: "marketId", type: "bytes32" }] },
  {
    type: "error",
    name: "StakeTooHigh",
    inputs: [
      { name: "stake", type: "uint256" },
      { name: "maxStakePerWindow", type: "uint256" },
    ],
  },
  { type: "error", name: "SessionExpired", inputs: [] },
  { type: "error", name: "WindowLimitReached", inputs: [] },
  { type: "error", name: "TransferFailed", inputs: [] },
  { type: "error", name: "UnknownMarket", inputs: [{ name: "marketId", type: "bytes32" }] },
  { type: "error", name: "PlaceRejected", inputs: [] },
  { type: "error", name: "InvalidPrice", inputs: [] },
  { type: "error", name: "InvalidSide", inputs: [{ name: "side", type: "uint8" }] },
  {
    type: "error",
    name: "InvalidQuantity",
    inputs: [
      { name: "quantity", type: "uint256" },
      { name: "lotSize", type: "uint256" },
    ],
  },
  {
    type: "error",
    name: "QuantityBelowMinimum",
    inputs: [
      { name: "quantity", type: "uint256" },
      { name: "minQuantity", type: "uint256" },
    ],
  },
] as const;

export const pulseMarketAdapterAbi = [
  {
    type: "function",
    name: "held",
    stateMutability: "view",
    inputs: [
      { name: "session", type: "address" },
      { name: "marketId", type: "bytes32" },
      { name: "side", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "OutcomeRecorded",
    inputs: [
      { name: "holder", type: "address", indexed: true },
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "outcomeIdx", type: "uint8", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

export const MARKET_FINALIZED_TOPIC =
  "0x8f396ac6cf2e01887362e2b39d8e56860042c604e5b1b481c87e6d9f90006e08" as const;
export const SESSION_ON_EVENT_SELECTOR = "0x0bde80f3" as const;
const ZERO_TOPIC = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export function encodeRule(rule: SessionPolicyInput["rule"]) {
  if (rule === "stop-on-loss") return 2;
  return rule === "martingale-off" ? 1 : 0;
}

export function decodeRule(rule: number): SessionRule {
  if (rule === 2) return "stop-on-loss";
  return rule === 1 ? "martingale-off" : "hold";
}

export function toContractPolicy(policy: SessionPolicyInput) {
  return {
    maxStakePerWindow: policy.maxStakePerWindow,
    maxWindows: policy.maxWindows,
    expiry: BigInt(policy.expiry),
    rule: encodeRule(policy.rule),
  };
}

export async function subscribeSessionToSettlement(
  exchange: SomniaMarkets,
  walletClient: WalletClient,
  session: Address,
  settlementEmitter: Address,
  topic0: Hex,
  marketId: Hex,
) {
  const reactivity = createReactivity(exchange.client, { wallet: walletClient });

  return unwrap(
    await reactivity.subscribeRaw({
      eventTopics: [topic0, marketId, ZERO_TOPIC, ZERO_TOPIC],
      origin: zeroAddress,
      caller: zeroAddress,
      emitter: settlementEmitter,
      handlerContractAddress: session,
      handlerFunctionSelector: SESSION_ON_EVENT_SELECTOR,
      ...DEFAULT_SUBSCRIPTION_OPTIONS,
      isGuaranteed: false,
      isCoalesced: false,
    }),
  );
}

export function isReactivityCaller(caller: Address) {
  return caller.toLowerCase() === SOMNIA_REACTIVITY_PRECOMPILE.toLowerCase();
}
