"use client";

import { WindowCard } from "@/components/marketing/WindowCard";
import { Card } from "@/components/ui";
import { StateNotice, Skeleton } from "@/components/app/StateNotice";
import { useMarkets } from "@/lib/app-data";

// === Component

/*
  Marketing proof should be as live as the app: show the next indexed testnet
  BTC/ETH window, or an honest empty/error state if the feed has no row.
*/
export function LiveWindowCard() {
  const { data: markets, isLoading, isError } = useMarkets();

  if (isLoading) {
    return <Skeleton className="h-[25rem] w-full" />;
  }

  if (isError) {
    return (
      <Card glow className="p-5 sm:p-6">
        <StateNotice title="Live feed unavailable" body="The Somnia indexer will retry shortly." />
      </Card>
    );
  }

  const market = markets?.find((item) => item.status === "trading") ?? markets?.[0];

  if (!market) {
    return (
      <Card glow className="p-5 sm:p-6">
        <StateNotice title="No live windows" body="No BTC or ETH testnet windows are listed yet." />
      </Card>
    );
  }

  return <WindowCard market={market} />;
}
