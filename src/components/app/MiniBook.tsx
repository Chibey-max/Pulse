"use client";

import { useOrderBook } from "@/lib/app-data";
import { Skeleton } from "@/components/app/StateNotice";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/cn";

// === Component

/*
  Three asks and three bids in Up terms. Down is always 1 - Up, never a second feed.
*/
export function MiniBook({ marketId }: { marketId: string }) {
  const { data, isLoading, isError } = useOrderBook(marketId);

  if (isLoading) {
    return <Skeleton className="h-40 w-full" />;
  }

  if (isError || !data) {
    return <p className="text-micro text-text-muted font-mono">Book unavailable. Retrying.</p>;
  }

  const rows = [
    ...data.asks
      .slice(0, 3)
      .reverse()
      .map((level) => ({ ...level, side: "ask" as const })),
    ...data.bids.slice(0, 3).map((level) => ({ ...level, side: "bid" as const })),
  ];

  return (
    <div className="flex flex-col gap-1">
      <div className="text-micro text-text-muted grid grid-cols-2 font-mono tracking-wider uppercase">
        <span>Up price</span>
        <span className="text-right">Size</span>
      </div>
      {rows.map((row, index) => (
        <div
          key={`${row.side}-${index}`}
          className="text-caption font-mono-numbers grid grid-cols-2 font-mono"
        >
          <span className={cn(row.side === "ask" ? "text-down" : "text-up")}>
            {row.price.toFixed(2)}
          </span>
          <span className="text-text-secondary text-right">{formatAmount(row.size, 0)}</span>
        </div>
      ))}
    </div>
  );
}
