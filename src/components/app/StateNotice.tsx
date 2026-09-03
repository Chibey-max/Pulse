import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// === Types

export interface StateNoticeProps {
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  tone?: "neutral" | "warn";
  className?: string;
}

// === Component

/*
  The shared shell for empty, loading-failed, wrong-network, and zero-balance states.
  Never shows a bare error string; always says what happened and the next action.
*/
export function StateNotice({
  title,
  body,
  action,
  tone = "neutral",
  className,
}: StateNoticeProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border p-6",
        tone === "warn" ? "border-warn/40 bg-warn/8" : "border-border bg-bg-panel",
        className,
      )}
    >
      <h2 className="text-body text-text-primary font-medium">{title}</h2>
      {body ? <div className="text-caption text-text-secondary max-w-md">{body}</div> : null}
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

// === Skeleton

export function Skeleton({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("bg-bg-elevated animate-pulse rounded-md", className)} />
  );
}
