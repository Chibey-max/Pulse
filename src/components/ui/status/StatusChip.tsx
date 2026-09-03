import { MdRadioButtonUnchecked, MdCheckCircle, MdFiberManualRecord, MdLock } from "react-icons/md";
import type { WindowStatus } from "@/lib/types";
import { cn } from "@/lib/cn";

// === Config

/*
  Status is communicated by icon shape and label, never colour alone (WCAG). The colour
  token is a reinforcement, not the signal.
*/
const CONFIG: Record<
  WindowStatus,
  { label: string; icon: typeof MdRadioButtonUnchecked; tone: string }
> = {
  listed: { label: "Listed", icon: MdRadioButtonUnchecked, tone: "text-text-muted" },
  trading: { label: "Trading", icon: MdFiberManualRecord, tone: "text-up" },
  locked: { label: "Locked", icon: MdLock, tone: "text-warn" },
  resolved: { label: "Resolved", icon: MdCheckCircle, tone: "text-signal" },
  voided: { label: "Voided", icon: MdRadioButtonUnchecked, tone: "text-text-secondary" },
};

// === Component

export function StatusChip({ status, className }: { status: WindowStatus; className?: string }) {
  const { label, icon: Icon, tone } = CONFIG[status];

  return (
    <span
      className={cn(
        "rounded-pill border-border-bright bg-bg-elevated text-micro inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono tracking-wider uppercase",
        tone,
        className,
      )}
    >
      <Icon size={11} aria-hidden="true" />
      {label}
    </span>
  );
}
