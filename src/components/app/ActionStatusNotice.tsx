import { useState } from "react";
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

/*
  Only rewrite a detail into the "add STT" advice when the wallet genuinely could not pay.
  A bare /gas/ match used to catch every revert surfaced through gas estimation — a
  SessionAlreadyExists or MarketNotAllowed revert would be reported as an empty wallet,
  sending the user to the faucet for a problem the faucet cannot fix.
*/
function cleanDetail(detail?: string): string | undefined {
  if (!detail) return undefined;
  if (/insufficient funds|exceeds balance|fee.*unavailable|needs STT/i.test(detail)) {
    return "MetaMask cannot cover the network fee. Add STT to this wallet, then try again.";
  }
  const signatureRejection = detail.match(/User denied transaction signature/i);
  if (signatureRejection) return "MetaMask rejected the transaction signature.";
  const userRejected = detail.match(/User rejected the request/i);
  if (userRejected) return "The request was rejected in the wallet.";
  return detail.length > 220 ? `${detail.slice(0, 220)}...` : detail;
}

// === Component

export function ActionStatusNotice({ tone, title, detail, hint, hash }: ActionStatusNoticeProps) {
  const Icon = ICONS[tone];
  const cleaned = cleanDetail(detail);
  const [open, setOpen] = useState<boolean>(false);
  const canShowRaw = Boolean(detail && cleaned && detail !== cleaned);

  return (
    <div className={cn("rounded-lg border p-3 shadow-sm", TONE_CLASS[tone])} role="status">
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
          {canShowRaw ? (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                className="text-micro text-text-muted hover:text-text-primary font-mono tracking-wider uppercase transition-colors"
              >
                {open ? "Hide details" : "Show details"}
              </button>
              {open ? (
                <pre className="border-border bg-bg text-text-secondary mt-2 max-h-36 overflow-auto rounded-md border p-2 text-[0.68rem] leading-relaxed whitespace-pre-wrap">
                  {detail}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
