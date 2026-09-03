"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { parseUnits } from "viem";
import type { PulsePair, PulseWindow, SessionPolicyInput, SessionRule } from "@/lib/types";
import { Card, CtaButton } from "@/components/ui";
import { FaucetCard } from "@/components/app/FaucetCard";
import { useCollateralDecimals } from "@/lib/app-data/collateral";
import { useMarkets } from "@/lib/app-data";
import { useSessionActions } from "@/lib/app-data/session-writes";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/cn";

// === Types

interface Policy {
  budget: number;
  maxPerWindow: number;
  windows: number;
  pair: PulsePair;
  window: PulseWindow;
  rule: SessionRule;
  expiryHours: number;
}

const RULE_OPTIONS: { value: SessionRule; label: string; copy: string }[] = [
  { value: "hold", label: "Hold", copy: "Same side every window" },
  { value: "martingale-off", label: "Fixed", copy: "Same side, fixed stake" },
  { value: "stop-on-loss", label: "Stop on loss", copy: "Disarm after one miss" },
];

// === Field

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-micro text-text-muted font-mono tracking-wider uppercase">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "rounded-lg border border-border-bright bg-bg-elevated px-3 py-2 font-mono text-body font-mono-numbers text-text-primary outline-none focus-visible:border-signal";

// === Component

export function SessionForm() {
  const router = useRouter();
  const [policy, setPolicy] = useState<Policy>({
    budget: 200,
    maxPerWindow: 25,
    windows: 4,
    pair: "ETH",
    window: "15m",
    rule: "stop-on-loss",
    expiryHours: 2,
  });
  const decimals = useCollateralDecimals();
  const { createSession, status } = useSessionActions();
  const { data: markets } = useMarkets();

  /* No factory: render an honest unavailable state, never a placeholder deploy action. */
  const fallback: boolean = status.unavailable;
  const allowedMarketIds =
    markets
      ?.filter((market) => market.pair === policy.pair)
      .filter((market) => market.window === policy.window)
      .filter((market) => market.status === "listed" || market.status === "trading")
      .map((market) => market.marketId) ?? [];

  useEffect(() => {
    if (status.phase === "done") router.push("/app");
  }, [status.phase, router]);

  function handleDeploy() {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const policyInput: SessionPolicyInput = {
      maxStakePerWindow: parseUnits(String(policy.maxPerWindow), decimals),
      maxWindows: policy.windows,
      expiry: nowSeconds + policy.expiryHours * 3600,
      rule: policy.rule,
      allowedMarketIds,
    };
    createSession(policyInput, policy.budget);
  }

  const deployLabel: string =
    status.phase === "approving"
      ? "Approving…"
      : status.phase === "creating"
        ? "Creating…"
        : status.phase === "depositing"
          ? "Funding…"
          : status.phase === "done"
            ? "Done"
            : "Deploy and fund session";

  const deployBusy: boolean =
    status.phase === "approving" ||
    status.phase === "creating" ||
    status.phase === "depositing" ||
    status.phase === "done";
  const deployDisabled: boolean = deployBusy || (!fallback && allowedMarketIds.length === 0);

  const ruleCopy = RULE_OPTIONS.find((option) => option.value === policy.rule)?.copy ?? "";
  const sentence = `${formatAmount(policy.budget, 0)} budget · ${formatAmount(
    policy.maxPerWindow,
    0,
  )} max per window · ${policy.windows} ${policy.pair} ${policy.window} windows · ${ruleCopy.toLowerCase()}`;

  return (
    <div className="flex flex-col gap-6">
      <FaucetCard />
      <Card className="grid gap-4 p-6 sm:grid-cols-2">
        <Field label="Budget (tUSDC)">
          <input
            type="number"
            min={1}
            value={policy.budget}
            onChange={(event) => setPolicy((p) => ({ ...p, budget: Number(event.target.value) }))}
            className={inputClass}
          />
        </Field>
        <Field label="Max per window (tUSDC)">
          <input
            type="number"
            min={1}
            value={policy.maxPerWindow}
            onChange={(event) =>
              setPolicy((p) => ({ ...p, maxPerWindow: Number(event.target.value) }))
            }
            className={inputClass}
          />
        </Field>
        <Field label="Windows">
          <input
            type="number"
            min={1}
            max={48}
            value={policy.windows}
            onChange={(event) => setPolicy((p) => ({ ...p, windows: Number(event.target.value) }))}
            className={inputClass}
          />
        </Field>
        <Field label="Expiry (hours from now)">
          <input
            type="number"
            min={1}
            value={policy.expiryHours}
            onChange={(event) =>
              setPolicy((p) => ({ ...p, expiryHours: Number(event.target.value) }))
            }
            className={inputClass}
          />
        </Field>
        <Field label="Pair">
          <div className="flex gap-2">
            {(["ETH", "BTC"] as PulsePair[]).map((pair) => (
              <button
                key={pair}
                type="button"
                onClick={() => setPolicy((p) => ({ ...p, pair }))}
                className={cn(
                  "rounded-pill text-caption border px-3 py-1.5 font-mono",
                  policy.pair === pair
                    ? "border-up bg-up/12 text-up"
                    : "border-border-bright text-text-secondary",
                )}
              >
                {pair}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Window">
          <div className="flex gap-2">
            {(["15m", "1h"] as PulseWindow[]).map((window) => (
              <button
                key={window}
                type="button"
                onClick={() => setPolicy((p) => ({ ...p, window }))}
                className={cn(
                  "rounded-pill text-caption border px-3 py-1.5 font-mono",
                  policy.window === window
                    ? "border-up bg-up/12 text-up"
                    : "border-border-bright text-text-secondary",
                )}
              >
                {window}
              </button>
            ))}
          </div>
        </Field>
      </Card>

      <Card className="flex flex-col gap-3 p-6">
        <span className="text-micro text-text-muted font-mono tracking-wider uppercase">Rule</span>
        <div className="grid gap-2 sm:grid-cols-3">
          {RULE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPolicy((p) => ({ ...p, rule: option.value }))}
              className={cn(
                "flex flex-col gap-1 rounded-lg border p-3 text-left",
                policy.rule === option.value
                  ? "border-signal/60 bg-signal/8"
                  : "border-border bg-bg-elevated",
              )}
            >
              <span className="text-caption text-text-primary font-medium">{option.label}</span>
              <span className="text-micro text-text-muted">{option.copy}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card glow className="flex flex-col gap-3 p-6">
        <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
          Policy, in plain words
        </span>
        <p className="text-body text-text-primary font-mono">{sentence}</p>
        <p className="text-caption text-text-secondary">
          Enforced onchain. Disarm and withdraw are always available and never blocked by the armed
          policy.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {fallback ? (
            <CtaButton variant="primary" disabled>
              Session factory unavailable
            </CtaButton>
          ) : (
            <CtaButton variant="primary" onClick={handleDeploy} disabled={deployDisabled}>
              {deployLabel}
            </CtaButton>
          )}
          <CtaButton variant="secondary" onClick={() => router.push("/app")}>
            Cancel
          </CtaButton>
        </div>

        {fallback ? (
          <p className="text-micro text-text-muted font-mono">
            Live session contracts are not configured for this environment.
          </p>
        ) : status.phase !== "idle" ? (
          <p className="text-micro text-text-secondary font-mono">
            {status.phase === "done" ? "Session funded. Redirecting…" : deployLabel}
          </p>
        ) : allowedMarketIds.length === 0 ? (
          <p className="text-micro text-down font-mono">
            No live {policy.pair} {policy.window} windows are available yet. Pick another pair or
            window.
          </p>
        ) : null}
        {status.error ? <p className="text-micro text-down font-mono">{status.error}</p> : null}
      </Card>
    </div>
  );
}
