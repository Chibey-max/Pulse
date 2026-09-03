"use client";

import Link from "next/link";
import type { Position } from "@/lib/types";
import { Card, StatusChip } from "@/components/ui";
import { StateNotice, Skeleton } from "@/components/app/StateNotice";
import { usePositions } from "@/lib/app-data";
import { formatAmount } from "@/lib/format";
import { cn } from "@/lib/cn";

// === Grouping

type Group = "Open" | "Locked" | "Unclaimed" | "Claimed";

function groupOf(position: Position): Group {
  if (position.status === "trading" || position.status === "listed") return "Open";
  if (position.status === "locked") return "Locked";
  return position.redeemable ? "Unclaimed" : "Claimed";
}

const ORDER: Group[] = ["Open", "Locked", "Unclaimed", "Claimed"];

// === Row

function PositionRow({ position }: { position: Position }) {
  return (
    <Link
      href={`/market/${position.marketId}`}
      className="hover:text-text-primary flex items-center justify-between gap-4 py-3 transition-colors"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-caption text-text-primary flex items-center gap-2">
          <span className={cn("font-mono", position.side === "up" ? "text-up" : "text-down")}>
            {position.side.toUpperCase()}
          </span>
          {formatAmount(Number(position.contracts))} contracts
        </span>
        <span className="text-micro text-text-muted font-mono">
          avg {position.avgPrice.toFixed(2)} · held by {position.heldBy}
        </span>
      </div>
      <StatusChip status={position.status} />
    </Link>
  );
}

// === Component

export function PositionsList() {
  const { data: positions, isLoading, isError } = usePositions();

  if (isLoading) {
    return <Skeleton className="h-56 w-full" />;
  }

  if (isError) {
    return (
      <StateNotice title="Could not load positions" body="Reconciling from chain again shortly." />
    );
  }

  if (!positions || positions.length === 0) {
    return (
      <StateNotice
        title="No positions"
        body="Call a window and it will appear here, keyed by market id."
      />
    );
  }

  const groups = ORDER.map((group) => ({
    group,
    items: positions.filter((p) => groupOf(p) === group),
  })).filter((entry) => entry.items.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {groups.map(({ group, items }) => (
        <div key={group} className="flex flex-col gap-2">
          <h2 className="text-micro text-text-muted font-mono tracking-wider uppercase">{group}</h2>
          <Card className="divide-border flex flex-col divide-y px-4">
            {items.map((position) => (
              <PositionRow key={`${position.marketId}-${position.side}`} position={position} />
            ))}
          </Card>
        </div>
      ))}
    </div>
  );
}
