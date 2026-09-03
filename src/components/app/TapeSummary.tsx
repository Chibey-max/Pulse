"use client";

import { Card, CountUp } from "@/components/ui";
import { Skeleton } from "@/components/app/StateNotice";
import { useTape } from "@/lib/app-data";
import { useHydrated } from "@/hooks/useHydrated";
import { cn } from "@/lib/cn";

// === Types

type StatEntry = {
  label: string;
  /* String figures (e.g. "4/6 wins") keep the value-flash remount trick. */
  value?: string;
  /* Plain numbers animate with CountUp instead. */
  numeric?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
};

// === Stat

/*
  Numeric figures roll with CountUp. String figures key the span on their own text, so a
  poll that moves the figure remounts it and `.value-flash` re-fires. The string path is
  gated on hydration so it does not flash once on first paint.
*/
function Stat({ label, value, numeric, decimals = 0, prefix, suffix }: StatEntry) {
  const hydrated = useHydrated();

  return (
    <div className="flex flex-col gap-1">
      <span className="text-micro text-text-muted font-mono tracking-wider uppercase">{label}</span>
      {numeric !== undefined ? (
        <CountUp
          value={numeric}
          decimals={decimals}
          prefix={prefix}
          suffix={suffix}
          className="text-body font-mono-numbers text-text-primary font-mono"
        />
      ) : (
        <span
          key={value}
          className={cn(
            "text-body font-mono-numbers text-text-primary font-mono",
            hydrated && "value-flash",
          )}
        >
          {value}
        </span>
      )}
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

  const realized = Number(tape.realized);

  const stats: StatEntry[] = [
    {
      label: "Realised",
      numeric: realized,
      decimals: 2,
      prefix: realized > 0 ? "+" : "",
      suffix: " tUSDC",
    },
    { label: "Unclaimed", value: `${tape.unclaimed} tUSDC` },
    { label: "Today", value: `${tape.todayWins}/${tape.todayCalls} wins` },
    { label: "Streak", numeric: Number(tape.streak) },
    { label: "Auto-claims", numeric: Number(tape.autoClaims) },
  ];

  return (
    <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((stat) => (
        <Stat key={stat.label} {...stat} />
      ))}
    </Card>
  );
}
