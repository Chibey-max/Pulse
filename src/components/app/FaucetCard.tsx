"use client";

import { MdWaterDrop } from "react-icons/md";
import { useAccount } from "wagmi";
import { Card, CtaButton } from "@/components/ui";
import { IS_MOCK } from "@/lib/app-data";
import { getTxUrl } from "@/lib/chain";
import { useCollateralBalance, useFaucet } from "@/lib/app-data/collateral";

// === Component

/*
  Shown only when the connected wallet holds no tUSDC. Explains the testnet faucet (a real
  onchain call, not a dead button) and mints the per-call cap so the user can fund a
  session. Falls back to an info line when the app is in mock mode.
*/
export function FaucetCard() {
  const { isConnected } = useAccount();
  const { isZero, isLoading } = useCollateralBalance();
  const { mint, status, hash } = useFaucet();

  if (!isConnected || isLoading || !isZero) return null;

  const label =
    status === "pending"
      ? "Confirm in wallet…"
      : status === "confirming"
        ? "Minting…"
        : status === "confirmed"
          ? "Minted"
          : "Mint 10,000 tUSDC";

  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <MdWaterDrop size={16} aria-hidden="true" className="text-signal" />
        <h2 className="text-body text-text-primary font-medium">Get testnet tUSDC</h2>
      </div>
      <p className="text-caption text-text-secondary max-w-md">
        Your wallet holds no tUSDC on this testnet. The collateral token has a public faucet that
        mints up to 10,000 per call, enough to open and fund a session.
      </p>

      {IS_MOCK ? (
        <p className="text-micro text-text-muted font-mono">
          Configure NEXT_PUBLIC_MOCK=0 and endpoints to use the faucet
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <CtaButton
            variant="primary"
            size="sm"
            className="self-start"
            onClick={mint}
            disabled={status === "pending" || status === "confirming" || status === "confirmed"}
          >
            {label}
          </CtaButton>

          {hash ? (
            <a
              href={getTxUrl(hash)}
              target="_blank"
              rel="noreferrer"
              className="text-micro text-signal font-mono"
            >
              {status === "confirmed" ? "Minted." : "Pending."} View transaction
            </a>
          ) : status === "error" ? (
            <p className="text-micro text-down font-mono">Faucet call failed. Try again.</p>
          ) : null}
        </div>
      )}
    </Card>
  );
}
