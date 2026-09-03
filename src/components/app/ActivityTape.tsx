"use client";

import { AnimatePresence, motion } from "motion/react";
import { MdNorthEast } from "react-icons/md";
import type { TapeEntry, TapeKind } from "@/lib/app-data";
import { useActivity } from "@/lib/app-data";
import { StateNotice, Skeleton } from "@/components/app/StateNotice";
import { listItem } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { formatLocalTime, truncateHex } from "@/lib/format";
import { cn } from "@/lib/cn";

// === Copy

const KIND_LABEL: Record<TapeKind, string> = {
  placed: "Placed",
  filled: "Filled",
  cancelled: "Cancelled",
  locked: "Locked",
  resolved: "Resolved",
  "auto-claimed": "Auto-claimed",
  "auto-rolled": "Auto-rolled",
  withdrawn: "Withdrawn",
};

// === Row

function Row({ entry }: { entry: TapeEntry }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-caption text-text-primary flex items-center gap-2">
          {KIND_LABEL[entry.kind]}
          <span className="text-text-muted">·</span>
          <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
            {entry.symbol}
          </span>
          {entry.side ? (
            <span
              className={cn("text-micro font-mono", entry.side === "up" ? "text-up" : "text-down")}
            >
              {entry.side.toUpperCase()}
            </span>
          ) : null}
        </span>
        <span className="text-micro text-text-muted flex items-center gap-2 font-mono">
          {formatLocalTime(entry.ts)}
          {entry.amount ? <span>· {entry.amount} tUSDC</span> : null}
          {entry.noSignature ? <span className="text-signal">· no signature required</span> : null}
        </span>
      </div>
      <a
        href="#"
        className="text-micro font-mono-numbers text-text-secondary hover:text-signal flex items-center gap-1 font-mono transition-colors"
      >
        {truncateHex(entry.txHash)}
        <MdNorthEast size={11} aria-hidden="true" />
      </a>
    </div>
  );
}

// === Component

export function ActivityTape({ limit }: { limit?: number }) {
  const { data, isLoading, isError } = useActivity();
  const prefersReduced = usePrefersReducedMotion();

  if (isLoading) {
    return <Skeleton className="h-56 w-full" />;
  }

  if (isError) {
    return (
      <StateNotice title="Could not load activity" body="The tape will retry on the next poll." />
    );
  }

  const entries = limit ? (data ?? []).slice(0, limit) : (data ?? []);

  if (entries.length === 0) {
    return (
      <StateNotice
        title="No activity yet"
        body="Placed orders, fills, settlements, and the redemptions you never signed all show up here."
      />
    );
  }

  return (
    <ul className="divide-border flex flex-col divide-y">
      <AnimatePresence initial={false}>
        {entries.map((entry) => (
          <motion.li
            key={entry.id}
            layout={!prefersReduced}
            variants={listItem}
            initial={prefersReduced ? false : "hidden"}
            animate="visible"
            exit="exit"
          >
            <Row entry={entry} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
