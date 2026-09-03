"use client";

import { Card } from "@/components/ui";
import { ActivityTape } from "@/components/app";

// === Component

/*
  Deep-link context: the wallet's live activity tape sits beside the decision card.
*/
export function MarketActivity({ marketId }: { marketId: string }) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
          Window activity
        </span>
        <span className="text-micro font-mono-numbers text-text-muted font-mono">
          {marketId.slice(0, 10)}…
        </span>
      </div>
      <ActivityTape limit={6} />
    </Card>
  );
}
