"use client";

import { Card } from "@/components/ui";
import { Skeleton } from "@/components/app/StateNotice";
import { useTape } from "@/lib/app-data";
import { useHydrated } from "@/hooks/useHydrated";
import { formatSigned } from "@/lib/format";
import { cn } from "@/lib/cn";

// === Stat

/*
  The value span is keyed on its own text, so a poll that moves the figure remounts it
  and the `.value-flash` animation re-fires. Gated on hydration so it does not flash once
  on first paint.
*/
function Stat({ label, value }: { label: string; value: string }) {
  const hydrated = useHydrated();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-micro text-text-muted font-mono tracking-wider uppercase">{label}</span>
      <span
        key={value}
        className={cn(
          "text-body font-mono-numbers text-text-primary font-mono",
          hydrated && "value-flash",
        )}
      >
        {value}
      </span>
    </div>
  );
}

// === Component

/*
  This window, today, realised vs unclaimed, streak. One number for P&L, reconciled from
  chain. Each figure flashes when the poll actually moves it.
*/
export function TapeSummary() {
  const { data: tape, isLoading } = useTape();

  if (isLoading || !tape) {
    return <Skeleton className="h-24 w-full" />;
  }

  const stats = [
    { label: "Realised", value: `${formatSigned(Number(tape.realized))} tUSDC` },
    { label: "Unclaimed", value: `${tape.unclaimed} tUSDC` },
    { label: "Today", value: `${tape.todayWins}/${tape.todayCalls} wins` },
    { label: "Streak", value: `${tape.streak}` },
    { label: "Auto-claims", value: `${tape.autoClaims}` },
  ];

  return (
    <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <Stat key={stat.label} label={stat.label} value={stat.value} />
      ))}
    </Card>
  );
}
