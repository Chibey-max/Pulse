import Link from "next/link";
import type { MarketCard } from "@/lib/types";
import { Countdown, StatusChip } from "@/components/ui";

// === Component

export function MarketTile({ market }: { market: MarketCard }) {
  return (
    <Link
      href={`/market/${market.marketId}`}
      className="edge-glow card-rest shadow-elevation bg-bg-panel flex flex-col gap-3 rounded-lg p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption text-text-primary font-mono tracking-wider uppercase">
          {market.pair} · {market.window}
        </span>
        <StatusChip status={market.status} />
      </div>

      <Countdown expiryTs={market.expiryTs} />

      <dl className="text-micro font-mono-numbers flex items-center justify-between font-mono">
        <div className="flex flex-col gap-0.5">
          <dt className="text-text-muted tracking-wider uppercase">Strike</dt>
          <dd className="text-text-secondary">{market.strike ? `$${market.strike}` : "—"}</dd>
        </div>
        <div className="flex flex-col gap-0.5 text-right">
          <dt className="text-text-muted tracking-wider uppercase">Up / Down</dt>
          <dd>
            <span className="text-up">{(market.upPrice ?? 0).toFixed(2)}</span>
            <span className="text-text-muted"> / </span>
            <span className="text-down">{(market.downPrice ?? 0).toFixed(2)}</span>
          </dd>
        </div>
      </dl>
    </Link>
  );
}
