/* Sample content for the public session proof page. Labelled as sample in the UI. */

export const SESSION_POLICY_VIEW = [
  { label: "Budget", value: "200 tUSDC" },
  { label: "Remaining", value: "142.60 tUSDC" },
  { label: "Max per window", value: "25 tUSDC" },
  { label: "Windows left", value: "2 of 4" },
  { label: "Rule", value: "Stops after one miss" },
  { label: "Expiry", value: "in 1h 32m" },
] as const;

export const SETTLEMENT_PROOF = [
  { action: "Session opened and funded", by: "Owner", signed: true, txHash: "0xa10c...77de" },
  {
    action: "Call placed · ETH 15m Up",
    by: "Session contract",
    signed: true,
    txHash: "0xb221...9f04",
  },
  { action: "Market settlement", by: "Somnia validators", signed: false, txHash: "0x9f2c...41ab" },
  {
    action: "Winnings redeemed",
    by: "Reactivity precompile 0x0100",
    signed: false,
    txHash: "0x3d81...c0e7",
  },
  {
    action: "Rolled into next window",
    by: "Reactivity precompile 0x0100",
    signed: false,
    txHash: "0x77ac...12bd",
  },
] as const;
