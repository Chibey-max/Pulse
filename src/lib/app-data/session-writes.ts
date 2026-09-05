"use client";

import { useCallback, useState } from "react";
import { erc20Abi, parseUnits } from "viem";
import { useAccount, useConfig, useWalletClient, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { useQueryClient } from "@tanstack/react-query";
import { createPulseExchange } from "@/lib/markets";
import {
  MARKET_FINALIZED_TOPIC,
  pulseSessionAbi,
  pulseSessionFactoryAbi,
  subscribeSessionToSettlement,
  toContractPolicy,
} from "@/lib/session";
import type { SessionPolicyInput } from "@/lib/types";
import { BINARY_MODULE_ADDRESS, SESSION_FACTORY_ADDRESS } from "./config";
import { useCollateralAddress, useCollateralDecimals } from "./collateral";

/*
  Write layer over PulseSessionFactory + PulseSession. createSession is a three-transaction
  flow (createSession -> approve the returned session -> deposit into that vault) run as a
  linear async state machine: each step awaits its receipt before the next. When the
  factory is absent every action returns early and status.unavailable is true, so
  components render the not-deployed state instead of faking a transaction.
*/

// === Constants

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// === Types

export type SessionActionPhase =
  | "idle"
  | "approving"
  | "creating"
  | "depositing"
  | "subscribing"
  | "withdrawing"
  | "disarming"
  | "done"
  | "error";

export interface SessionActionStatus {
  phase: SessionActionPhase;
  /* True when this environment has no deployed factory: actions no-op. */
  unavailable: boolean;
  error?: string;
  hash?: `0x${string}`;
}

export interface SessionActions {
  createSession: (policy: SessionPolicyInput, initialDeposit: number) => void;
  deposit: (amount: number) => void;
  withdraw: (amount: number) => void;
  disarm: () => void;
  status: SessionActionStatus;
}

// === Hook

export function useSessionActions(): SessionActions {
  const config = useConfig();
  const { address: owner } = useAccount();
  const token = useCollateralAddress();
  const decimals = useCollateralDecimals();
  const queryClient = useQueryClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  const unavailable: boolean = !SESSION_FACTORY_ADDRESS;

  const [phase, setPhase] = useState<SessionActionPhase>("idle");
  const [error, setError] = useState<string | undefined>(undefined);
  const [hash, setHash] = useState<`0x${string}` | undefined>(undefined);

  const send = useCallback(
    async (params: Parameters<typeof writeContractAsync>[0]): Promise<void> => {
      const txHash = await writeContractAsync(params);
      setHash(txHash);
      await waitForTransactionReceipt(config, { hash: txHash });
    },
    [writeContractAsync, config],
  );

  const readSessionAddress = useCallback(async (): Promise<`0x${string}` | undefined> => {
    if (!owner || !SESSION_FACTORY_ADDRESS) return undefined;
    const addr = await readContract(config, {
      address: SESSION_FACTORY_ADDRESS,
      abi: pulseSessionFactoryAbi,
      functionName: "sessionOf",
      args: [owner],
    });
    return addr && addr !== ZERO_ADDRESS ? addr : undefined;
  }, [config, owner]);

  const fail = useCallback((err: unknown): void => {
    setPhase("error");
    setError(err instanceof Error ? err.message : "Transaction failed");
  }, []);

  const createSession = useCallback(
    (policy: SessionPolicyInput, initialDeposit: number): void => {
      if (unavailable || !SESSION_FACTORY_ADDRESS) return;
      if (!owner) {
        setError("Connect a wallet to deploy a session.");
        setPhase("error");
        return;
      }
      const factory = SESSION_FACTORY_ADDRESS;
      void (async () => {
        try {
          setError(undefined);
          const deposit = parseUnits(String(initialDeposit), decimals);

          setPhase("creating");
          await send({
            address: factory,
            abi: pulseSessionFactoryAbi,
            functionName: "createSession",
            args: [toContractPolicy(policy), policy.allowedMarketIds],
          });

          const session = await readSessionAddress();
          if (!session) throw new Error("Session address not found after creation");

          setPhase("approving");
          await send({
            address: token,
            abi: erc20Abi,
            functionName: "approve",
            args: [session, deposit],
          });

          setPhase("depositing");
          await send({
            address: session,
            abi: pulseSessionAbi,
            functionName: "deposit",
            args: [deposit],
          });

          if (!walletClient) throw new Error("Wallet client is not ready for subscription.");

          setPhase("subscribing");
          const exchange = createPulseExchange(walletClient);
          for (const marketId of policy.allowedMarketIds) {
            const subscriptionHash = await subscribeSessionToSettlement(
              exchange,
              walletClient,
              session,
              BINARY_MODULE_ADDRESS,
              MARKET_FINALIZED_TOPIC,
              marketId,
            );
            setHash(subscriptionHash);
            await waitForTransactionReceipt(config, { hash: subscriptionHash });
          }

          setPhase("done");
          void queryClient.invalidateQueries({ queryKey: ["session", owner] });
          void queryClient.invalidateQueries({ queryKey: ["positions", owner] });
          void queryClient.invalidateQueries({ queryKey: ["tape", owner] });
        } catch (err) {
          fail(err);
        }
      })();
    },
    [
      unavailable,
      owner,
      decimals,
      token,
      send,
      readSessionAddress,
      walletClient,
      config,
      queryClient,
      fail,
    ],
  );

  const runOnSession = useCallback(
    (working: SessionActionPhase, run: (session: `0x${string}`) => Promise<void>): void => {
      if (unavailable) return;
      if (!owner) {
        setError("Connect a wallet to continue.");
        setPhase("error");
        return;
      }
      void (async () => {
        try {
          setError(undefined);
          const session = await readSessionAddress();
          if (!session) throw new Error("No session found for this wallet");
          setPhase(working);
          await run(session);
          setPhase("done");
          void queryClient.invalidateQueries({ queryKey: ["session", owner] });
          void queryClient.invalidateQueries({ queryKey: ["positions", owner] });
          void queryClient.invalidateQueries({ queryKey: ["tape", owner] });
        } catch (err) {
          fail(err);
        }
      })();
    },
    [unavailable, readSessionAddress, queryClient, owner, fail],
  );

  const deposit = useCallback(
    (amount: number): void => {
      runOnSession("approving", async (session) => {
        const deposit = parseUnits(String(amount), decimals);
        await send({
          address: token,
          abi: erc20Abi,
          functionName: "approve",
          args: [session, deposit],
        });
        setPhase("depositing");
        await send({
          address: session,
          abi: pulseSessionAbi,
          functionName: "deposit",
          args: [deposit],
        });
      });
    },
    [runOnSession, send, decimals, token],
  );

  const withdraw = useCallback(
    (amount: number): void => {
      runOnSession("withdrawing", (session) =>
        send({
          address: session,
          abi: pulseSessionAbi,
          functionName: "withdraw",
          args: [parseUnits(String(amount), decimals)],
        }),
      );
    },
    [runOnSession, send, decimals],
  );

  const disarm = useCallback((): void => {
    runOnSession("disarming", (session) =>
      send({
        address: session,
        abi: pulseSessionAbi,
        functionName: "disarm",
      }),
    );
  }, [runOnSession, send]);

  return {
    createSession,
    deposit,
    withdraw,
    disarm,
    status: { phase, unavailable, error, hash },
  };
}
