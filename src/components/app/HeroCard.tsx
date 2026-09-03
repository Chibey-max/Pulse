"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import type { MarketCard } from "@/lib/types";
import { Card, Countdown, StatusChip } from "@/components/ui";
import { ActionRow } from "@/components/app/ActionRow";
import { MiniBook } from "@/components/app/MiniBook";
import { Skeleton } from "@/components/app/StateNotice";
import { useCall } from "@/components/app/hooks";
import { useMarkets, usePositions } from "@/lib/app-data";
import { formatAmount } from "@/lib/format";

// === Types

export interface HeroCardProps {
  /* Pin to one market. Defaults to the ETH 15m window, then the first trading window. */
  marketId?: string;
}

// === Helpers

function pickMarket(markets: MarketCard[], marketId?: string): MarketCard | undefined {
  if (marketId) {
    return markets.find((m) => m.marketId.toLowerCase() === marketId.toLowerCase());
  }
  return (
    markets.find((m) => m.symbol === "ETH-15m") ??
    markets.find((m) => m.status === "trading") ??
    markets[0]
  );
}

// === Component

export function HeroCard({ marketId }: HeroCardProps) {
  const { isConnected } = useAccount();
  const { data: markets, isLoading } = useMarkets();
  const { data: positions } = usePositions();

  const market = useMemo(
    () => (markets ? pickMarket(markets, marketId) : undefined),
    [markets, marketId],
  );
  const { call, status } = useCall(market);

  if (isLoading || !markets) {
    return <Skeleton className="h-[28rem] w-full" />;
  }

  if (!market) {
    return (
      <Card className="p-6">
        <p className="text-body text-text-secondary">
          No live window right now. Check back shortly.
        </p>
      </Card>
    );
  }

  const position = positions?.find(
    (p) => p.marketId.toLowerCase() === market.marketId.toLowerCase(),
  );
  const tradeable = market.status === "trading";
  const disabledReason = !isConnected
    ? "Connect a wallet on Somnia Shannon testnet to call this window."
    : !tradeable
      ? `Window is ${market.status}. Calls are closed.`
      : undefined;

  return (
    <Card glow className="flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-caption text-text-secondary font-mono tracking-wider uppercase">
            {market.pair} · {market.window}
          </span>
          <span className="text-micro text-text-muted font-mono">
            {market.marketId.slice(0, 10)}…
          </span>
        </div>
        <StatusChip status={market.status} />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
          Resolves in
        </span>
        <Countdown expiryTs={market.expiryTs} size="hero" />
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <div className="border-border bg-bg-elevated flex flex-col gap-1 rounded-lg border p-3">
          <dt className="text-micro text-text-muted font-mono tracking-wider uppercase">Strike</dt>
          <dd className="text-body font-mono-numbers text-text-primary font-mono">
            {market.strike ? `$${market.strike}` : "—"}
          </dd>
        </div>
        <div className="border-border bg-bg-elevated flex flex-col gap-1 rounded-lg border p-3">
          <dt className="text-micro text-text-muted font-mono tracking-wider uppercase">
            Your position
          </dt>
          <dd className="text-body font-mono-numbers text-text-primary font-mono">
            {position
              ? `${formatAmount(Number(position.contracts))} ${position.side.toUpperCase()}`
              : "None"}
          </dd>
        </div>
      </dl>

      <ActionRow
        market={market}
        disabled={!tradeable || !isConnected}
        disabledReason={disabledReason}
        pending={status === "placing"}
        onCall={call}
      />

      <div className="border-border flex flex-col gap-2 border-t pt-4">
        <span className="text-micro text-text-muted font-mono tracking-wider uppercase">Book</span>
        <MiniBook marketId={market.marketId} />
      </div>
    </Card>
  );
}
