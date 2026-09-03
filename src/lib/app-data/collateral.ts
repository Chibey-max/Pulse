"use client";

import { useCallback, useState } from "react";
import { erc20Abi, formatUnits } from "viem";
import { useAccount, useChainId, useReadContract, useSwitchChain, useWalletClient } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { getCollateral, SOMNIA_SHANNON_CHAIN_ID } from "@/lib/chain";
import { formatAmount } from "@/lib/format";
import { createPulseExchange } from "@/lib/markets";

/*
  Collateral (tUSDC on Shannon) reads and the testnet faucet. The token scale is always
  read from decimals() at runtime and threaded through; nothing here hardcodes 1e6.
*/

// === Constants

const FAUCET_CAP = 10_000;

// === Types

export type FaucetStatus = "idle" | "pending" | "confirming" | "confirmed" | "error";

export interface CollateralBalance {
  raw: bigint;
  formatted: string;
  decimals: number;
  isZero: boolean;
  isLoading: boolean;
}

export interface FaucetResult {
  mint: () => void;
  status: FaucetStatus;
  hash: `0x${string}` | undefined;
  error: string | undefined;
}

// === Address + decimals

export function useCollateralAddress(): `0x${string}` {
  return getCollateral(SOMNIA_SHANNON_CHAIN_ID).address;
}

export function useCollateralDecimals(): number {
  const address = useCollateralAddress();
  const { data } = useReadContract({
    address,
    abi: erc20Abi,
    functionName: "decimals",
    chainId: SOMNIA_SHANNON_CHAIN_ID,
  });

  return data ?? 6;
}

// === Balance

export function useCollateralBalance(): CollateralBalance {
  const { address: account } = useAccount();
  const token = useCollateralAddress();
  const decimals = useCollateralDecimals();

  const { data, isLoading } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    chainId: SOMNIA_SHANNON_CHAIN_ID,
    query: { enabled: Boolean(account), refetchInterval: 5_000 },
  });

  const raw: bigint = data ?? BigInt(0);
  const formatted: string = formatAmount(Number(formatUnits(raw, decimals)));

  return { raw, formatted, decimals, isZero: raw === BigInt(0), isLoading };
}

// === Faucet

export function useFaucet(): FaucetResult {
  const { address: account } = useAccount();
  const connectedChainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { data: walletClient } = useWalletClient();
  const token = useCollateralAddress();
  const decimals = useCollateralDecimals();
  const queryClient = useQueryClient();
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [status, setStatus] = useState<FaucetStatus>("idle");
  const [error, setError] = useState<string | undefined>();

  /*
    Disabled read purely to obtain the canonical wagmi query key for the balance, so the
    confirmed-faucet effect can invalidate exactly the entry useCollateralBalance reads.
  */
  const { queryKey: balanceKey } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    chainId: SOMNIA_SHANNON_CHAIN_ID,
    query: { enabled: false },
  });

  const mint = useCallback(() => {
    void (async () => {
      try {
        setError(undefined);
        setStatus("pending");

        if (!account) throw new Error("Connect a wallet before minting tUSDC.");
        if (connectedChainId !== SOMNIA_SHANNON_CHAIN_ID) {
          await switchChainAsync({ chainId: SOMNIA_SHANNON_CHAIN_ID });
        }
        if (!walletClient) throw new Error("Wallet client is not ready for Somnia Shannon.");

        const scale = BigInt(10) ** BigInt(decimals);
        const amount = BigInt(FAUCET_CAP) * scale;
        const exchange = createPulseExchange(walletClient);
        const result = await exchange.trader.faucet({ amount, testUsdc: token });

        setHash(result.hash);
        setStatus("confirmed");
        await queryClient.invalidateQueries({ queryKey: balanceKey });
        await queryClient.invalidateQueries({ queryKey: ["readContract"] });
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Faucet call failed.");
      }
    })();
  }, [
    account,
    balanceKey,
    connectedChainId,
    decimals,
    queryClient,
    switchChainAsync,
    token,
    walletClient,
  ]);

  return { mint, status, hash, error };
}
