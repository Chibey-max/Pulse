"use client";

import { useState } from "react";
import type { CallSide, MarketCard } from "@/lib/types";
import { CtaButton } from "@/components/ui";
import { effectiveContracts, formatAmount } from "@/lib/format";
import { cn } from "@/lib/cn";

// === Types

export interface ActionRowProps {
  market: MarketCard;
  disabled?: boolean;
  disabledReason?: string;
  /* A call is in flight: lock both buttons and swap the labels. */
  pending?: boolean;
  onCall?: (side: CallSide, stake: number) => void;
}

const PRESETS = [10, 25, 50, 100] as const;

// === Component

/*
  Size presets plus the two calls. The helper always repeats capped risk and shows the
  pre-confirmation math (max loss = stake, effective contracts = stake / price).
*/
export function ActionRow({
  market,
  disabled = false,
  disabledReason,
  pending = false,
  onCall,
}: ActionRowProps) {
  const [stake, setStake] = useState<number>(25);
  const [custom, setCustom] = useState<string>("");

  const up = market.upPrice ?? 0.5;
  const down = market.downPrice ?? 0.5;

  function selectPreset(value: number): void {
    setStake(value);
    setCustom("");
  }

  function onCustom(value: string): void {
    setCustom(value);
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) setStake(parsed);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => selectPreset(value)}
            aria-pressed={stake === value && custom === ""}
            className={cn(
              "rounded-pill text-caption font-mono-numbers border px-3 py-1.5 font-mono transition-colors",
              stake === value && custom === ""
                ? "border-up bg-up/12 text-up"
                : "border-border-bright text-text-secondary hover:border-text-muted",
            )}
          >
            {value}
          </button>
        ))}
        <label className="rounded-pill border-border-bright flex items-center gap-2 border px-3 py-1.5">
          <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
            Custom
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={1}
            value={custom}
            onChange={(event) => onCustom(event.target.value)}
            placeholder="0"
            className="text-caption font-mono-numbers text-text-primary w-16 bg-transparent font-mono outline-none"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <CtaButton
          variant="primary"
          onClick={() => onCall?.("up", stake)}
          disabled={disabled || pending}
          className="bg-up"
        >
          {pending ? "Placing…" : `Call Up · ${up.toFixed(2)}`}
        </CtaButton>
        <CtaButton
          variant="primary"
          onClick={() => onCall?.("down", stake)}
          disabled={disabled || pending}
          className="bg-down text-on-down hover:bg-down-dim"
        >
          {pending ? "Placing…" : `Call Down · ${down.toFixed(2)}`}
        </CtaButton>
      </div>

      <p className="text-micro text-text-secondary font-mono">
        {disabled && disabledReason ? (
          disabledReason
        ) : (
          <>
            Stake {formatAmount(stake)} · max loss {formatAmount(stake)} · win pays 1.00 per
            contract · ~{formatAmount(effectiveContracts(stake, up))} contracts on Up
          </>
        )}
      </p>
    </div>
  );
}
