"use client";

import { useState } from "react";
import type { SessionState } from "@/lib/types";
import { Card, CountUp, CtaButton, CtaLink } from "@/components/ui";
import { ActionStatusNotice } from "@/components/app/ActionStatusNotice";
import { Skeleton } from "@/components/app/StateNotice";
import { useSession } from "@/lib/app-data";
import { useSessionActions } from "@/lib/app-data/session-writes";
import { useCountdown } from "@/hooks/useCountdown";

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
  const { deposit, disarm, withdraw, rearm, status } = useSessionActions();
  const [transferMode, setTransferMode] = useState<"fund" | "withdraw" | null>(null);
  const [amount, setAmount] = useState<string>("");
  const sessionExpiry = useCountdown(session?.expiry ?? Number.MAX_SAFE_INTEGER);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }

  if (!session) {
    return (
      <Card className="flex flex-col gap-3 p-5">
        <h2 className="text-body text-text-primary font-medium">No session</h2>
        <p className="text-caption text-text-secondary">
          Open a session to set a budget and hard limits for session-held positions.
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
  const expired = sessionExpiry.expired;
  const sessionStatus = expired ? "Expired" : session.armed ? "Armed" : "Disarmed";
  /* Expired or disarmed both block place(); rearm() is the only way back for either. */
  const needsRearm = expired || !session.armed;

  return (
    <Card glow className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-body text-text-primary font-medium">Session</h2>
        <span
          className={
            expired
              ? "text-micro text-down font-mono tracking-wider uppercase"
              : "text-micro text-signal font-mono tracking-wider uppercase"
          }
        >
          {sessionStatus}
        </span>
      </div>

      <div className="border-border bg-bg-elevated/70 grid gap-2 rounded-lg border p-3 sm:grid-cols-3">
        {["Owner signs", "Clone enforces", "Validator redeems"].map((label) => (
          <div key={label} className="flex items-center gap-2">
            <span className="bg-signal size-1.5 rounded-full" aria-hidden="true" />
            <span className="text-micro text-text-secondary font-mono tracking-wider uppercase">
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="text-caption font-mono-numbers flex items-baseline justify-between font-mono">
          <CountUp value={remaining} suffix=" tUSDC" className="text-text-primary" />
          <span className="text-text-muted">vault balance</span>
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
        <div className="grid grid-cols-3 gap-2">
          {needsRearm ? (
            <CtaButton variant="primary" size="sm" onClick={() => rearm(2, 20)}>
              Re-arm
            </CtaButton>
          ) : (
            <CtaButton variant="secondary" size="sm" onClick={disarm}>
              Disarm
            </CtaButton>
          )}
          <CtaButton
            variant="secondary"
            size="sm"
            onClick={() => setTransferMode((mode) => (mode === "fund" ? null : "fund"))}
          >
            Fund
          </CtaButton>
          <CtaButton
            variant="secondary"
            size="sm"
            onClick={() => setTransferMode((mode) => (mode === "withdraw" ? null : "withdraw"))}
          >
            Withdraw
          </CtaButton>
        </div>

        {transferMode ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={transferMode === "fund" ? "Fund amount" : "Withdraw amount"}
              className="border-border-bright bg-bg-elevated text-caption font-mono-numbers text-text-primary focus-visible:border-signal w-full rounded-lg border px-3 py-1.5 font-mono outline-none"
            />
            <CtaButton
              variant="primary"
              size="sm"
              disabled={!amount}
              onClick={() =>
                transferMode === "fund" ? deposit(Number(amount)) : withdraw(Number(amount))
              }
            >
              {transferMode === "fund" ? "Fund" : "Confirm"}
            </CtaButton>
          </div>
        ) : null}

        {remaining <= 0 ? (
          <ActionStatusNotice
            tone="info"
            title="Fund the session before calling"
            detail="This wallet has a session clone, so calls route through the session contract. The vault needs tUSDC before it can place a call."
          />
        ) : null}

        {expired ? (
          <ActionStatusNotice
            tone="error"
            title="Session expired"
            detail="Calls through this session are closed by its onchain policy. Start a fresh session for the next demo run, or use a wallet without a session for Direct mode."
          />
        ) : null}

        {status.unavailable ? (
          <ActionStatusNotice
            tone="info"
            title="Session contracts unavailable"
            detail="This environment is missing the deployed session factory."
          />
        ) : status.phase !== "idle" ? (
          <ActionStatusNotice
            tone={
              status.phase === "error" ? "error" : status.phase === "done" ? "success" : "pending"
            }
            title={
              status.phase === "rearming"
                ? "Re-arming session"
                : status.phase === "disarming"
                  ? "Disarming session"
                  : status.phase === "withdrawing"
                    ? "Withdrawing from session"
                    : status.phase === "done"
                      ? "Session action confirmed"
                      : status.phase === "error"
                        ? "Session action stopped"
                        : "Working"
            }
            detail={status.error}
            hint={
              status.phase === "error"
                ? "Nothing else was submitted. You can adjust and try again."
                : undefined
            }
            hash={status.hash}
          />
        ) : null}
      </div>
    </Card>
  );
}
