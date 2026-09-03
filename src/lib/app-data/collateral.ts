"use client";

import { useCallback, useEffect } from "react";
import { erc20Abi, formatUnits } from "viem";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { getCollateral } from "@/lib/chain";
import { formatAmount } from "@/lib/format";

/*
  Collateral (tUSDC on Shannon) reads and the testnet faucet. The token scale is always
  read from decimals() at runtime and threaded through; nothing here hardcodes 1e6.
*/

// === Constants

/* Faucet contract rejects any single call above this. */
const FAUCET_CAP = 10_000;

const faucetAbi = [
  {
    type: "function",
    name: "faucet",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
] as const;

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
}

// === Address + decimals

export function useCollateralAddress(): `0x${string}` {
  const chainId = useChainId();
  return getCollateral(chainId).address;
}

export function useCollateralDecimals(): number {
  const address = useCollateralAddress();
  const { data } = useReadContract({
    address,
    abi: erc20Abi,
    functionName: "decimals",
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
    query: { enabled: Boolean(account) },
  });

  const raw: bigint = data ?? BigInt(0);
  const formatted: string = formatAmount(Number(formatUnits(raw, decimals)));

  return { raw, formatted, decimals, isZero: raw === BigInt(0), isLoading };
}

// === Faucet

export function useFaucet(): FaucetResult {
  const { address: account } = useAccount();
  const token = useCollateralAddress();
  const decimals = useCollateralDecimals();
  const queryClient = useQueryClient();

  /*
    Disabled read purely to obtain the canonical wagmi query key for the balance, so the
    confirmed-faucet effect can invalidate exactly the entry useCollateralBalance reads.
  */
  const { queryKey: balanceKey } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { enabled: false },
  });

  const { data: hash, writeContract, status: writeStatus } = useWriteContract();
  const { status: receiptStatus } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (receiptStatus === "success") {
      void queryClient.invalidateQueries({ queryKey: balanceKey });
    }
  }, [receiptStatus, queryClient, balanceKey]);

  const mint = useCallback(() => {
    const scale = BigInt(10) ** BigInt(decimals);
    const amount = BigInt(FAUCET_CAP) * scale;
    writeContract({
      address: token,
      abi: faucetAbi,
      functionName: "faucet",
      args: [amount],
    });
  }, [decimals, token, writeContract]);

  const status: FaucetStatus =
    writeStatus === "error" || receiptStatus === "error"
      ? "error"
      : receiptStatus === "success"
        ? "confirmed"
        : hash
          ? "confirming"
          : writeStatus === "pending"
            ? "pending"
            : "idle";

  return { mint, status, hash };
}
