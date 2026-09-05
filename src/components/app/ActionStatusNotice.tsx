import { MdCheckCircle, MdErrorOutline, MdHourglassTop, MdOpenInNew } from "react-icons/md";
import { getTxUrl } from "@/lib/chain";
import { cn } from "@/lib/cn";

// === Types

type NoticeTone = "error" | "pending" | "success" | "info";

export interface ActionStatusNoticeProps {
  tone: NoticeTone;
  title: string;
  detail?: string;
  hint?: string;
  hash?: `0x${string}`;
}

// === Helpers

const TONE_CLASS: Record<NoticeTone, string> = {
  error: "border-down/35 bg-down/10 text-down",
  pending: "border-signal/35 bg-signal/10 text-signal",
  success: "border-up/35 bg-up/10 text-up",
  info: "border-border-bright bg-bg-elevated text-text-secondary",
};

const ICONS = {
  error: MdErrorOutline,
  pending: MdHourglassTop,
  success: MdCheckCircle,
  info: MdHourglassTop,
} as const;

function cleanDetail(detail?: string): string | undefined {
  if (!detail) return undefined;
  const signatureRejection = detail.match(/User denied transaction signature/i);
  if (signatureRejection) return "MetaMask rejected the transaction signature.";
  const userRejected = detail.match(/User rejected the request/i);
  if (userRejected) return "The request was rejected in the wallet.";
  return detail.length > 280 ? `${detail.slice(0, 280)}...` : detail;
}

// === Component

export function ActionStatusNotice({ tone, title, detail, hint, hash }: ActionStatusNoticeProps) {
  const Icon = ICONS[tone];
  const cleaned = cleanDetail(detail);

  return (
    <div className={cn("rounded-lg border p-3", TONE_CLASS[tone])} role="status">
      <div className="flex items-start gap-3">
        <span className="bg-bg-panel/70 mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md">
          <Icon size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-caption text-text-primary font-medium">{title}</p>
            {hash ? (
              <a
                href={getTxUrl(hash)}
                target="_blank"
                rel="noreferrer"
                className="text-micro text-signal inline-flex items-center gap-1 font-mono tracking-wider uppercase"
              >
                tx <MdOpenInNew size={13} aria-hidden="true" />
              </a>
            ) : null}
          </div>
          {cleaned ? <p className="text-caption mt-1 break-words">{cleaned}</p> : null}
          {hint ? <p className="text-micro text-text-muted mt-2 font-mono">{hint}</p> : null}
        </div>
      </div>
    </div>
  );
}
