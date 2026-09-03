import type { MarketCard } from "@/lib/types";
import { Card, Countdown, StatusChip, TiltCard } from "@/components/ui";

// === Types

export interface WindowCardProps {
  market: MarketCard;
  /* Renders the "Sample data" ribbon and disables the action row. */
  sample?: boolean;
  className?: string;
}

// === Component

/*
  Read-only presentation of one event-contract window, used in the marketing hero. The
  app route renders an interactive version of the same shape. Up probability is the
  book; Down is always 1 - Up, derived, never a second feed.
*/
export function WindowCard({ market, sample = false, className }: WindowCardProps) {
  const up = market.upPrice ?? 0;
  const down = market.downPrice ?? 1 - up;

  return (
    <TiltCard className={className}>
      <Card glow className="flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-caption text-text-secondary font-mono tracking-wider uppercase">
              {market.pair} · {market.window}
            </span>
            {sample ? (
              <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
                Sample data
              </span>
            ) : null}
          </div>
          <StatusChip status={market.status} />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
            Resolves in
          </span>
          <Countdown
            expiryTs={market.expiryTs}
            size="hero"
            staticValue={sample ? "08:42" : undefined}
          />
        </div>

        <dl className="grid grid-cols-2 gap-3">
          <div className="border-border bg-bg-elevated flex flex-col gap-1 rounded-lg border p-3">
            <dt className="text-micro text-text-muted font-mono tracking-wider uppercase">
              Strike
            </dt>
            <dd className="text-body font-mono-numbers text-text-primary font-mono">
              {market.strike ? `$${market.strike}` : "—"}
            </dd>
          </div>
          <div className="border-border bg-bg-elevated flex flex-col gap-1 rounded-lg border p-3">
            <dt className="text-micro text-text-muted font-mono tracking-wider uppercase">
              Implied
            </dt>
            <dd className="text-body font-mono-numbers flex items-baseline gap-2 font-mono">
              <span className="text-up">Up {up.toFixed(2)}</span>
              <span className="text-text-muted">/</span>
              <span className="text-down">Down {down.toFixed(2)}</span>
            </dd>
          </div>
        </dl>

        <div className="grid grid-cols-2 gap-3" aria-hidden={sample}>
          <span className="rounded-pill bg-up/12 text-up flex h-11 items-center justify-center font-medium">
            Call Up
          </span>
          <span className="rounded-pill bg-down/12 text-down flex h-11 items-center justify-center font-medium">
            Call Down
          </span>
        </div>
      </Card>
    </TiltCard>
  );
}
