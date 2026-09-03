"use client";

import { useMemo, useState } from "react";
import { useMarkets } from "@/lib/app-data";
import { MarketTile, Skeleton, StateNotice } from "@/components/app";
import { MarketFilters, type MarketFilterValue } from "./MarketFilters";

// === Component

export function MarketsGrid() {
  const { data: markets, isLoading, isError } = useMarkets();
  const [filter, setFilter] = useState<MarketFilterValue>({ pair: "all", window: "all" });

  const filtered = useMemo(() => {
    if (!markets) return [];
    return markets.filter(
      (market) =>
        (filter.pair === "all" || market.pair === filter.pair) &&
        (filter.window === "all" || market.window === filter.window),
    );
  }, [markets, filter]);

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <StateNotice title="Could not load markets" body="Retrying on the next poll." />;
  }

  if (!markets || markets.length === 0) {
    return <StateNotice title="No live windows" body="A new window lists every few minutes." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <MarketFilters value={filter} onChange={setFilter} />

      {filtered.length === 0 ? (
        <StateNotice
          title="No windows match"
          body="Try a wider filter. New windows list every few minutes."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((market) => (
            <MarketTile key={market.marketId} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
