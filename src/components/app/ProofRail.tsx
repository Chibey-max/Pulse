import {
  MdAccountBalanceWallet,
  MdBolt,
  MdCheckCircle,
  MdNorthEast,
  MdOutlineHub,
  MdPolicy,
} from "react-icons/md";
import { Card, CtaLink } from "@/components/ui";
import {
  PULSE_EVIDENCE,
  evidenceTxUrl,
  explorerAddressUrl,
  type EvidenceTxKey,
} from "@/lib/evidence";
import { truncateHex } from "@/lib/format";
import { cn } from "@/lib/cn";

// === Data

type StepTone = "user" | "protocol" | "validator" | "ready";

const TONE_CLASS: Record<StepTone, string> = {
  user: "border-signal/30 bg-signal/10 text-signal",
  protocol: "border-warn/35 bg-warn/10 text-warn",
  validator: "border-up/30 bg-up/10 text-up",
  ready: "border-border-bright bg-bg-elevated text-text-secondary",
};

const PROOF_STEPS: readonly {
  label: string;
  actor: string;
  detail: string;
  txKey?: EvidenceTxKey;
  tone: StepTone;
  icon: typeof MdCheckCircle;
}[] = [
  {
    label: "Session subscribed",
    actor: "Pulse + Reactivity",
    detail:
      "The clone listens for DreamDEX market-finalized events through the Reactivity precompile.",
    txKey: "subscriptionTx",
    tone: "protocol",
    icon: MdOutlineHub,
  },
  {
    label: "User placed a capped call",
    actor: "Wallet owner",
    detail:
      "The owner signs the trade intent; the funded clone enforces the cap and allowed market.",
    txKey: "sessionCallTx",
    tone: "user",
    icon: MdAccountBalanceWallet,
  },
  {
    label: "Validator redeemed settlement",
    actor: "Somnia validator path",
    detail:
      "The handler callback credited the session after resolution, proven by the redemption tx.",
    txKey: "validatorRedemptionTx",
    tone: "validator",
    icon: MdBolt,
  },
  {
    label: "Vault stays ready",
    actor: "Session clone",
    detail:
      "Funds remain under the same owner-controlled session until the owner places, withdraws, or disarms.",
    tone: "ready",
    icon: MdPolicy,
  },
];

const EVIDENCE_LINKS = [
  {
    label: "Factory",
    value: PULSE_EVIDENCE.factory,
    href: explorerAddressUrl(PULSE_EVIDENCE.factory),
  },
  { label: "Clone", value: PULSE_EVIDENCE.clone, href: explorerAddressUrl(PULSE_EVIDENCE.clone) },
  {
    label: "Handler",
    value: PULSE_EVIDENCE.handlerSelector,
    href: evidenceTxUrl("validatorRedemptionTx"),
  },
] as const;

// === Component

export function ProofRail({ compact = false }: { compact?: boolean }) {
  return (
    <Card glow className="overflow-hidden p-0">
      <div className="border-border bg-bg-panel/80 flex flex-col gap-4 border-b p-5 sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-h3 text-text-primary font-display font-semibold">
              Settlement Proof
            </h2>
            <p className="text-caption text-text-secondary max-w-2xl">
              Pulse is not a new market. It is a session layer around DreamDEX Event Contracts:
              user-signed calls, then validator-invoked redemption when the window resolves.
            </p>
          </div>
          {!compact ? (
            <CtaLink variant="secondary" size="sm" href="/judge">
              Evidence trace
            </CtaLink>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {EVIDENCE_LINKS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="border-border-bright bg-bg-elevated hover:border-signal/60 group flex min-w-0 items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors"
            >
              <span className="min-w-0">
                <span className="text-micro text-text-muted block font-mono tracking-wider uppercase">
                  {item.label}
                </span>
                <span className="text-caption font-mono-numbers text-text-primary block truncate font-mono">
                  {truncateHex(item.value)}
                </span>
              </span>
              <MdNorthEast
                size={14}
                aria-hidden="true"
                className="text-text-muted group-hover:text-signal shrink-0"
              />
            </a>
          ))}
        </div>
      </div>

      <ol className="divide-border grid gap-0 divide-y lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        {PROOF_STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.label} className="relative flex min-w-0 flex-col gap-3 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                    TONE_CLASS[step.tone],
                  )}
                >
                  <Icon size={18} aria-hidden="true" />
                </span>
                {step.txKey ? (
                  <a
                    href={evidenceTxUrl(step.txKey)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-micro text-signal inline-flex items-center gap-1 font-mono tracking-wider uppercase"
                  >
                    tx
                    <MdNorthEast size={11} aria-hidden="true" />
                  </a>
                ) : (
                  <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
                    live
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-caption text-text-primary font-medium">{step.label}</p>
                <p className="text-micro text-text-muted mt-0.5 font-mono tracking-wider uppercase">
                  {step.actor}
                </p>
                <p className="text-caption text-text-secondary mt-2">{step.detail}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
