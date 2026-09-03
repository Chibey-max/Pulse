"use client";

import { useAccount, useChainId } from "wagmi";
import { getCollateral } from "@/lib/chain";
import { useCollateralBalance } from "@/lib/app-data/collateral";

// === Component

/*
  Compact collateral balance for the app header. Renders nothing when disconnected and is
  hidden on small screens where the wallet button alone has to fit.
*/
export function WalletBalance() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { formatted, isLoading } = useCollateralBalance();

  if (!isConnected) return null;

  return (
    <span className="text-caption text-text-secondary font-mono-numbers hidden font-mono md:inline">
      {isLoading ? "···" : `${formatted} ${getCollateral(chainId).symbol}`}
    </span>
  );
}
