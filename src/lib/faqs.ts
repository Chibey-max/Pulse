import type { FaqItem } from "@/components/ui/faq/types";

/*
  Single source of truth for FAQ content. The landing page renders FAQS.slice(0, 5) with
  a link to /faq; the /faq route renders the full list. Answers stay claims-disciplined:
  testnet only, no promise of profit (see docs/Pulse-PRD.md section 18).
*/
export const FAQS: readonly FaqItem[] = [
  {
    question: "What is an event contract?",
    answer:
      "A capped-risk Up/Down market on BTC or ETH over a 15 minute or 1 hour window. Zero fees, fully collateralised, settled onchain. You call which way the candle finishes; a winning contract redeems for 1 unit of collateral.",
  },
  {
    question: "What can I lose?",
    answer:
      "Only your stake. Max loss equals the amount you put in on a call. There is no leverage and no liquidation. In session mode the vault holds only the budget you deposit, so that budget is your absolute maximum loss.",
  },
  {
    question: "Who holds my funds?",
    answer:
      "You do. In direct mode positions stay in your own wallet. In session mode they sit in a per-user contract that only you can withdraw from. No operator delegation, no custody handoff, and no path in the contract moves value to anyone but you.",
  },
  {
    question: "Can I withdraw anytime?",
    answer:
      "Yes. Withdraw is never blocked by an armed session policy. You can disarm or withdraw mid-window, after expiry, or at any point in a run.",
  },
  {
    question: "How do winnings reach me without a signature?",
    answer:
      "A session contract subscribes to market settlement through Somnia's Reactivity precompile. When a window resolves, validators invoke the session's handler directly, which redeems the winning outcome tokens and credits your session balance. You sign once when you open the session and never again.",
  },
  {
    question: "What happens when a market is voided?",
    answer:
      "A voided market redeems both sides at 0.5. It is redeemable, not a loss, and Pulse treats it that way in every P&L figure.",
  },
  {
    question: "What does autopilot decide?",
    answer:
      "Nothing on its own. Autopilot is a deterministic rule you set at the start: same side every window, a fixed stake that never increases, or stop after one losing window. There is no model, no sentiment signal, and no discretion. The card states the rule in plain words.",
  },
  {
    question: "Do I need to keep a tab open?",
    answer:
      "No. There is no polling service, no keeper bot, and no browser tab requirement. Once a session is armed you can close everything; settlement and any autopilot roll happen onchain.",
  },
  {
    question: "Why testnet?",
    answer:
      "Pulse is built for the Somnia Shannon testnet with mainnet-ready types. Collateral is test tUSDC with no real value. Mainnet with USDso is on the roadmap, not in this build.",
  },
];
