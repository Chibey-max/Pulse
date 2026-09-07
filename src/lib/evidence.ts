import { BINARY_MODULE_ADDRESS } from "@/lib/app-data/config";
import { SOMNIA_REACTIVITY_PRECOMPILE, getExplorerUrl, getTxUrl } from "@/lib/chain";

// === Evidence

export const PULSE_EVIDENCE = {
  liveUrl: "https://pulse-session.vercel.app",
  githubUrl: "https://github.com/Chibey-max/Pulse",
  chain: "Somnia Shannon",
  chainId: 50312,
  /*
    Pinned, not read from config: this is the factory that deployed the clone which served
    the validator redemption below. The app may point at a newer factory (a redeploy adds
    rearm() so a spent session is not a dead end), but the evidence trail must keep naming
    the immutable addresses the transaction actually touched, or `pnpm verify:evidence`
    would be checking a contract that never ran.
  */
  factory: "0x26d0A38dB17aC44ed91A90d68a3FDD7B366BCE84",
  /*
    The implementation the current factory clones, and the address embedded in the clone's
    EIP-1167 bytecode. It must be the one carrying selector 0x53edf33d — the previous
    factory's implementation (0x8eE927aF…) exposes the wrong onEvent(bytes) signature that
    never fires, so showing it here would contradict the redemption this page evidences.
  */
  implementation: "0x9a8C9Fceb88BEEBbE50E231674ab5F3C81CC69fe",
  clone: "0x5bc72C8fD675D0316c58196ab677E0277f6eF5eA",
  binaryModule: BINARY_MODULE_ADDRESS,
  reactivityPrecompile: SOMNIA_REACTIVITY_PRECOMPILE,
  handlerSelector: "0x53edf33d",
  subscriptionTx: "0xae98302bd2b7dab0fc2f2f92b3f046fae43a80fced6e30773cf81d9eb094baef",
  sessionCallTx: "0xc625de217a699d3538b5bce77d1eb3e5881379a13e6cac5c56eb833712dcccbb",
  validatorRedemptionTx: "0xe9bf34787416a0c46814b717868921a43d07491217b46ad03bd48124b14ef7b2",
} as const;

export type EvidenceTxKey = "subscriptionTx" | "sessionCallTx" | "validatorRedemptionTx";

export function explorerAddressUrl(address: `0x${string}`): string {
  return `${getExplorerUrl().replace(/\/$/, "")}/address/${address}`;
}

export function evidenceTxUrl(key: EvidenceTxKey): string {
  return getTxUrl(PULSE_EVIDENCE[key]);
}
