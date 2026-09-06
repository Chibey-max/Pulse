import {
  MdAccountBalanceWallet,
  MdCheckCircle,
  MdContentCopy,
  MdEventAvailable,
  MdNorthEast,
  MdOutlineTerminal,
  MdPlayArrow,
  MdShield,
} from "react-icons/md";
import { Card, CtaLink, Section, SectionHeading } from "@/components/ui";
import { ProofRail } from "@/components/app/ProofRail";
import { PULSE_EVIDENCE, evidenceTxUrl, explorerAddressUrl } from "@/lib/evidence";
import { truncateHex } from "@/lib/format";

// === Data

const PRODUCT_PATH = [
  {
    icon: MdPlayArrow,
    title: "Live product path",
    body: "Open the desk, choose BTC or ETH, pick Up or Down, and place a capped-risk call.",
    href: "/app",
    label: "Open desk",
  },
  {
    icon: MdAccountBalanceWallet,
    title: "Session vault",
    body: "Fund the clone, keep the owner in control, and let the session enforce allowed markets and caps.",
    href: `/session/${PULSE_EVIDENCE.clone}`,
    label: "View clone",
  },
  {
    icon: MdShield,
    title: "On-chain proof",
    body: "Inspect the validator redemption transaction, subscription, and session call in the hash trail.",
    href: evidenceTxUrl("validatorRedemptionTx"),
    label: "Open proof tx",
    external: true,
  },
] as const;

const PROOF_CLAIMS = [
  {
    icon: MdEventAvailable,
    title: "DreamDEX remains the market",
    body: "Pulse routes BTC and ETH Up/Down calls through DreamDEX Event Contracts instead of creating a separate venue.",
  },
  {
    icon: MdAccountBalanceWallet,
    title: "The session is owner-controlled",
    body: "The user signs explicit session actions. The clone enforces budget, market allow-list, and max-per-window policy.",
  },
  {
    icon: MdCheckCircle,
    title: "Settlement redemption is proven",
    body: "The validator redemption transaction hits the session handler and credits the vault after resolution.",
  },
] as const;

const HASH_ROWS = [
  {
    label: "Factory",
    value: PULSE_EVIDENCE.factory,
    href: explorerAddressUrl(PULSE_EVIDENCE.factory),
  },
  {
    label: "Implementation",
    value: PULSE_EVIDENCE.implementation,
    href: explorerAddressUrl(PULSE_EVIDENCE.implementation),
  },
  {
    label: "Session clone",
    value: PULSE_EVIDENCE.clone,
    href: explorerAddressUrl(PULSE_EVIDENCE.clone),
  },
  {
    label: "Subscription",
    value: PULSE_EVIDENCE.subscriptionTx,
    href: evidenceTxUrl("subscriptionTx"),
  },
  {
    label: "Session call",
    value: PULSE_EVIDENCE.sessionCallTx,
    href: evidenceTxUrl("sessionCallTx"),
  },
  {
    label: "Validator redeem",
    value: PULSE_EVIDENCE.validatorRedemptionTx,
    href: evidenceTxUrl("validatorRedemptionTx"),
  },
] as const;

// === Component

export function JudgeMode() {
  return (
    <Section id="evidence-trace" spacing="tight" label="Pulse evidence trace">
      <div className="flex flex-col gap-6">
        <SectionHeading
          id="evidence-trace"
          as="h1"
          title="Evidence Trace"
          description="A public verification dashboard for Pulse: what it proves, where the live product runs, and how the on-chain settlement path can be checked."
        />

        <div className="grid gap-4 lg:grid-cols-3">
          {PRODUCT_PATH.map((panel) => {
            const Icon = panel.icon;
            return (
              <Card key={panel.title} interactive className="flex flex-col gap-4 p-5">
                <span className="border-signal/30 bg-signal/10 text-signal flex size-10 items-center justify-center rounded-lg border">
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-body text-text-primary font-medium">{panel.title}</h2>
                  <p className="text-caption text-text-secondary mt-1">{panel.body}</p>
                </div>
                <CtaLink
                  href={panel.href}
                  external={"external" in panel ? panel.external : undefined}
                  variant="secondary"
                  size="sm"
                  className="mt-auto self-start"
                >
                  {panel.label}
                </CtaLink>
              </Card>
            );
          })}
        </div>

        <ProofRail compact />

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <Card className="p-5 sm:p-6">
            <div className="mb-4 flex items-start gap-3">
              <span className="border-up/30 bg-up/10 text-up flex size-10 shrink-0 items-center justify-center rounded-lg border">
                <MdCheckCircle size={20} aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-h3 text-text-primary font-display font-semibold">
                  What Pulse Proves
                </h2>
                <p className="text-caption text-text-secondary">
                  Product behavior and protocol evidence are separated into explicit checks.
                </p>
              </div>
            </div>
            <ul className="divide-border flex flex-col divide-y">
              {PROOF_CLAIMS.map((claim) => {
                const Icon = claim.icon;
                return (
                  <li key={claim.title} className="flex gap-3 py-3">
                    <span className="border-border-bright bg-bg-elevated text-signal mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border">
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="text-caption text-text-primary block font-medium">
                        {claim.title}
                      </span>
                      <span className="text-caption text-text-secondary mt-1 block">
                        {claim.body}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="overflow-hidden p-0">
            <div className="border-border flex items-center justify-between gap-3 border-b p-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="border-border-bright bg-bg-elevated text-text-secondary flex size-9 shrink-0 items-center justify-center rounded-lg border">
                  <MdOutlineTerminal size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-body text-text-primary font-medium">Verification Command</h2>
                  <p className="text-micro text-text-muted font-mono">Read-only evidence checker</p>
                </div>
              </div>
              <MdContentCopy size={16} aria-hidden="true" className="text-text-muted" />
            </div>
            <div className="bg-bg-elevated p-5">
              <code className="text-caption text-signal block font-mono break-words">
                pnpm verify:evidence
              </code>
              <p className="text-caption text-text-secondary mt-3">
                The script checks the deployed factory, clone, subscription, handler selector, and
                validator redemption trail without writing to chain.
              </p>
            </div>
          </Card>
        </div>

        <Card className="overflow-hidden p-0">
          <div className="border-border flex items-center justify-between border-b p-5">
            <h2 className="text-body text-text-primary font-medium">Hash Trail</h2>
            <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
              {PULSE_EVIDENCE.chain} · {PULSE_EVIDENCE.chainId}
            </span>
          </div>
          <div className="divide-border divide-y">
            {HASH_ROWS.map((row) => (
              <a
                key={row.label}
                href={row.href}
                target="_blank"
                rel="noreferrer"
                className="hover:bg-bg-elevated/60 grid gap-2 px-5 py-3 transition-colors sm:grid-cols-[11rem_1fr_auto] sm:items-center"
              >
                <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
                  {row.label}
                </span>
                <span className="text-caption font-mono-numbers text-text-primary min-w-0 font-mono break-all">
                  {row.value}
                </span>
                <span className="text-signal inline-flex items-center gap-1 font-mono text-[0.7rem] tracking-wider uppercase">
                  {truncateHex(row.value)}
                  <MdNorthEast size={11} aria-hidden="true" />
                </span>
              </a>
            ))}
          </div>
        </Card>
      </div>
    </Section>
  );
}
