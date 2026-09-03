"use client";

import { useState } from "react";
import type { SessionState } from "@/lib/types";
import { Card, CountUp, CtaButton, CtaLink } from "@/components/ui";
import { Skeleton } from "@/components/app/StateNotice";
import { useSession } from "@/lib/app-data";
import { useSessionActions } from "@/lib/app-data/session-writes";
import { formatAmount } from "@/lib/format";

// === Copy

const RULE_COPY: Record<SessionState["rule"], string> = {
  hold: "Calls the same side every window",
  "martingale-off": "Fixed stake, never increases",
  "stop-on-loss": "Stops after one losing window",
};

// === Component

/*
  Session state on the home card. Copy always states the cap first. Disarm and Withdraw
  are always enabled, never blocked by an armed policy.
*/
export function SessionCard() {
  const { data: session, isLoading } = useSession();
  const { disarm, withdraw, status } = useSessionActions();
  const [showWithdraw, setShowWithdraw] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>("");

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!session) {
    return (
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="text-body text-text-primary font-medium">No session</h2>
        <p className="text-caption text-text-secondary">
          Open a session to set a budget and hard limits, then let settlement redeem your winnings
          without another signature.
        </p>
        <CtaLink variant="primary" size="sm" href="/session/new" className="self-start">
          Start session
        </CtaLink>
      </Card>
    );
  }

  const remaining = Number(session.remaining.replace(/,/g, ""));
  const budget = Number(session.budget.replace(/,/g, ""));
  const pct = budget > 0 ? Math.max(0, Math.min(100, (remaining / budget) * 100)) : 0;

  return (
    <Card glow className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-body text-text-primary font-medium">Session</h2>
        <span className="text-micro text-signal font-mono tracking-wider uppercase">
          {session.armed ? "Armed" : "Disarmed"}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="text-caption font-mono-numbers flex items-baseline justify-between font-mono">
          <CountUp value={remaining} suffix=" tUSDC" className="text-text-primary" />
          <span className="text-text-muted">of {formatAmount(budget)}</span>
        </div>
        <div className="rounded-pill bg-bg-elevated h-1.5 w-full overflow-hidden">
          <div className="rounded-pill bg-up h-full" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-micro text-text-muted font-mono tracking-wider uppercase">
            Windows left
          </dt>
          <dd className="text-body font-mono-numbers text-text-primary font-mono">
            <CountUp value={Number(session.windowsLeft)} decimals={0} />
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-micro text-text-muted font-mono tracking-wider uppercase">Rule</dt>
          <dd className="text-caption text-text-secondary">{RULE_COPY[session.rule]}</dd>
        </div>
      </dl>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <CtaButton variant="secondary" size="sm" onClick={disarm}>
            Disarm
          </CtaButton>
          <CtaButton variant="secondary" size="sm" onClick={() => setShowWithdraw((open) => !open)}>
            Withdraw
          </CtaButton>
        </div>

        {showWithdraw ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Amount"
              className="border-border-bright bg-bg-elevated text-caption font-mono-numbers text-text-primary focus-visible:border-signal w-full rounded-lg border px-3 py-1.5 font-mono outline-none"
            />
            <CtaButton
              variant="primary"
              size="sm"
              disabled={!amount}
              onClick={() => withdraw(Number(amount))}
            >
              Confirm
            </CtaButton>
          </div>
        ) : null}

        {status.unavailable ? (
          <p className="text-micro text-text-muted font-mono">
            Session contracts are not deployed on this environment yet.
          </p>
        ) : status.phase !== "idle" ? (
          <p className="text-micro text-text-secondary font-mono">
            {status.phase === "disarming"
              ? "Disarming…"
              : status.phase === "withdrawing"
                ? "Withdrawing…"
                : status.phase === "done"
                  ? "Done."
                  : "Working…"}
          </p>
        ) : null}
        {status.error ? <p className="text-micro text-down font-mono">{status.error}</p> : null}
      </div>
    </Card>
  );
}
