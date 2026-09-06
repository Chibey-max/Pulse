"use client";

import { useEffect, useState } from "react";
import { MdCached, MdOutlineTimeline, MdWarningAmber } from "react-icons/md";
import { WindowCard } from "@/components/marketing/WindowCard";
import { Card, CtaButton, CtaLink } from "@/components/ui";
import { StateNotice } from "@/components/app/StateNotice";
import { cn } from "@/lib/cn";
import { useMarkets } from "@/lib/app-data";

// === Component

/*
  Marketing proof should be as live as the app: show the next indexed testnet
  BTC/ETH window, or an honest empty/error state if the feed has no row.
*/
export function LiveWindowCard() {
  const { data: markets, isLoading, isError, refetch, isRefetching } = useMarkets();
  const [slowFeed, setSlowFeed] = useState(false);

  useEffect(() => {
    if (!isLoading) return;

    const timer = window.setTimeout(() => setSlowFeed(true), 2_800);
    return () => window.clearTimeout(timer);
  }, [isLoading]);

  if (isLoading) {
    return (
      <LiveBoardLoading slowFeed={slowFeed} onRetry={() => void refetch()} busy={isRefetching} />
    );
  }

  if (isError) {
    return <LiveBoardFallback title="Live board unavailable" onRetry={() => void refetch()} />;
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

// === Loading and fallback states

function LiveBoardLoading({
  slowFeed,
  onRetry,
  busy,
}: {
  slowFeed: boolean;
  onRetry: () => void;
  busy: boolean;
}) {
  return (
    <Card
      glow
      className="border-border/80 relative min-h-[25rem] overflow-hidden border p-5 sm:p-6"
    >
      <div className="from-signal/8 pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent" />
      <div className="relative flex h-full min-h-[21rem] flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-caption text-text-secondary font-mono tracking-wider uppercase">
              Live desk
            </span>
            <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
              Somnia indexer
            </span>
          </div>
          <span className="rounded-pill border-border bg-bg-elevated text-signal text-micro inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono tracking-wider uppercase">
            <MdOutlineTimeline size={12} aria-hidden="true" />
            Syncing
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PulseSkeleton label="Pair" />
          <PulseSkeleton label="Status" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PulseSkeleton label="Strike" tall />
          <PulseSkeleton label="Implied" tall />
        </div>

        <div className="border-border space-y-2 border-t pt-4">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="grid grid-cols-[4rem_1fr_4rem] items-center gap-3">
              <span className="bg-down/35 h-3 rounded-full" />
              <span
                className={cn(
                  "bg-bg-elevated h-2 rounded-full",
                  row % 2 === 0 ? "w-full" : "w-4/5",
                )}
              />
              <span className="bg-up/35 h-3 rounded-full" />
            </div>
          ))}
        </div>

        {slowFeed ? (
          <div className="border-border bg-bg-panel/90 shadow-elevation mt-auto rounded-lg border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="bg-warn/12 text-warn flex size-9 shrink-0 items-center justify-center rounded-full">
                  <MdWarningAmber size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-body text-text-primary font-medium">Live preview is waiting</p>
                  <p className="text-caption text-text-secondary mt-1">
                    The public hero is waiting on DreamDEX live windows. The full desk can still be
                    opened directly.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <CtaButton variant="secondary" size="sm" onClick={onRetry} disabled={busy}>
                  <MdCached size={16} aria-hidden="true" />
                  Retry
                </CtaButton>
                <CtaLink variant="primary" size="sm" href="/app">
                  Open app
                </CtaLink>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function LiveBoardFallback({ title, onRetry }: { title: string; onRetry: () => void }) {
  return (
    <Card glow className="border-border/80 min-h-[25rem] border p-5 sm:p-6">
      <StateNotice
        title={title}
        body="The Somnia indexer did not return the landing preview. Open the app to retry the live desk, or use the evidence page for the on-chain proof trail."
        action={
          <>
            <CtaButton variant="secondary" size="sm" onClick={onRetry}>
              <MdCached size={16} aria-hidden="true" />
              Retry
            </CtaButton>
            <CtaLink variant="primary" size="sm" href="/app">
              Open app
            </CtaLink>
            <CtaLink variant="secondary" size="sm" href="/judge">
              Evidence
            </CtaLink>
          </>
        }
      />
    </Card>
  );
}

function PulseSkeleton({ label, tall = false }: { label: string; tall?: boolean }) {
  return (
    <div className="border-border bg-bg-elevated/70 rounded-lg border p-3">
      <span className="text-micro text-text-muted font-mono tracking-wider uppercase">{label}</span>
      <span
        className={cn(
          "bg-text-muted/18 mt-3 block animate-pulse rounded-full",
          tall ? "h-7 w-4/5" : "h-4 w-2/3",
        )}
      />
    </div>
  );
}
