"use client";

import { Card, CtaButton } from "@/components/ui";
import { StateNotice, Skeleton } from "@/components/app/StateNotice";
import { useClaimAll } from "@/components/app/hooks";
import { useRedeemable } from "@/lib/app-data";
import { formatAmount } from "@/lib/format";

// === Component

/*
  Direct-mode claim-all. Lists every redeemable market with expected payout and a single
  confirm. Per-market error isolation is a runtime concern; the list is the UI surface.
*/
export function ClaimPanel() {
  const { data: redeemable, isLoading } = useRedeemable();
  const { claimAll, status } = useClaimAll();

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (!redeemable || redeemable.length === 0) {
    return (
      <StateNotice
        title="Nothing to claim"
        body="Winning and voided positions show up here the moment their window resolves."
      />
    );
  }

  const total = redeemable.reduce((sum, item) => sum + Number(item.expectedPayout), 0);

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="divide-border flex flex-col divide-y">
        {redeemable.map((item) => (
          <div key={item.marketId} className="flex items-center justify-between gap-4 py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-caption text-text-primary">{item.symbol}</span>
              <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
                {item.voided ? "Voided · 0.50 each side" : `${item.side} won`}
              </span>
            </div>
            <span className="text-body font-mono-numbers text-up font-mono">
              +{formatAmount(Number(item.expectedPayout))} tUSDC
            </span>
          </div>
        ))}
      </div>

      <div className="border-border flex items-center justify-between gap-4 border-t pt-4">
        <span className="text-caption text-text-muted font-mono tracking-wider uppercase">
          Total to wallet
        </span>
        <span className="text-body font-mono-numbers text-text-primary font-mono">
          {formatAmount(total)} tUSDC
        </span>
      </div>

      <CtaButton
        variant="primary"
        onClick={() => claimAll(redeemable)}
        disabled={status === "claiming"}
      >
        {status === "claiming" ? "Claiming…" : "Claim all"}
      </CtaButton>
    </Card>
  );
}
