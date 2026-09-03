"use client";

import type { PulsePair, PulseWindow } from "@/lib/types";
import { cn } from "@/lib/cn";

// === Types

export interface MarketFilterValue {
  pair: PulsePair | "all";
  window: PulseWindow | "all";
}

interface MarketFiltersProps {
  value: MarketFilterValue;
  onChange: (next: MarketFilterValue) => void;
}

// === Config

const PAIRS: Array<{ value: MarketFilterValue["pair"]; label: string }> = [
  { value: "all", label: "All pairs" },
  { value: "BTC", label: "BTC" },
  { value: "ETH", label: "ETH" },
];

const WINDOWS: Array<{ value: MarketFilterValue["window"]; label: string }> = [
  { value: "all", label: "All windows" },
  { value: "15m", label: "15m" },
  { value: "1h", label: "1h" },
];

// === Chip

function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-pill text-caption border px-3 py-1.5 font-mono transition-colors",
        active
          ? "border-up bg-up/12 text-up"
          : "border-border-bright text-text-secondary hover:border-text-muted",
      )}
    >
      {label}
    </button>
  );
}

// === Component

export function MarketFilters({ value, onChange }: MarketFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {PAIRS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={value.pair === option.value}
            onClick={() => onChange({ ...value, pair: option.value })}
          />
        ))}
      </div>
      <span aria-hidden="true" className="text-border-bright">
        |
      </span>
      <div className="flex flex-wrap items-center gap-2">
        {WINDOWS.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            active={value.window === option.value}
            onClick={() => onChange({ ...value, window: option.value })}
          />
        ))}
      </div>
    </div>
  );
}
