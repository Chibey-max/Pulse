"use client";

import { useCallback, useState } from "react";
import { useWalletClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/toast";
import { IS_MOCK } from "@/lib/app-data";
import type { Redeemable } from "@/lib/app-data";
import { claimAll as claimAllWrite } from "@/lib/app-data/writes";
import { getCollateral } from "@/lib/chain";
import { decodeTxError } from "@/lib/tx";
import { formatAmount } from "@/lib/format";

// === Types

export type ClaimStatus = "idle" | "claiming" | "success" | "error";

export interface UseClaimAll {
  claimAll: (redeemable?: Redeemable[]) => Promise<void>;
  status: ClaimStatus;
}

const MOCK_MESSAGE = "Live trading needs NEXT_PUBLIC_MOCK=0 and configured endpoints.";

// === Hook

export function useClaimAll(): UseClaimAll {
  const { data: walletClient } = useWalletClient();
  const { show, update } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ClaimStatus>("idle");

  const claimAll = useCallback(async (): Promise<void> => {
    if (IS_MOCK) {
      show({ title: "Sample mode", description: MOCK_MESSAGE, variant: "info" });
      return;
    }
    if (!walletClient) {
      show({
        title: "Connect a wallet",
        description: "Connect on Somnia Shannon testnet to claim.",
        variant: "error",
      });
      return;
    }

    setStatus("claiming");
    const toastId = show({
      title: "Claiming your payouts…",
      description: "One confirmation per resolved market.",
      variant: "pending",
    });

    try {
      /*
          TODO(live): the mock `Redeemable[]` from useRedeemable() is not the SDK's
          on-chain claimable shape, so we let the write wrapper re-fetch via getClaimable.
          Pass the real list through once liveDataSource is wired in source.ts.
        */
      const { claimed, failed } = await claimAllWrite(walletClient);
      const symbol = getCollateral().symbol;
      const total = claimed.reduce((sum, market) => sum + Number(market.expectedPayout), 0);

      if (claimed.length === 0) {
        update(toastId, {
          title: "Nothing claimed",
          description: decodeTxError(failed[0]?.error) || "Every claim failed. Try again shortly.",
          variant: "error",
          duration: 8_000,
        });
        setStatus("error");
        return;
      }

      const summary =
        failed.length === 0
          ? `Claimed ${claimed.length} ${claimed.length === 1 ? "market" : "markets"} · ${formatAmount(total)} ${symbol}`
          : `Claimed ${claimed.length}, ${failed.length} failed · ${formatAmount(total)} ${symbol}`;

      update(toastId, {
        title: failed.length === 0 ? "Payouts claimed" : "Some claims failed",
        description: summary,
        variant: failed.length === 0 ? "success" : "info",
        duration: 6_000,
      });
      setStatus("success");

      queryClient.invalidateQueries({ queryKey: ["redeemable"] });
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["tape"] });
    } catch (error) {
      update(toastId, {
        title: "Claim not submitted",
        description: decodeTxError(error),
        variant: "error",
        duration: 8_000,
      });
      setStatus("error");
    }
  }, [walletClient, show, update, queryClient]);

  return { claimAll, status };
}
