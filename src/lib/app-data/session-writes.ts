"use client";

import { useCallback, useState } from "react";
import { erc20Abi, parseUnits } from "viem";
import { useAccount, useConfig, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "wagmi/actions";
import { useQueryClient } from "@tanstack/react-query";
import { pulseSessionAbi, pulseSessionFactoryAbi, toContractPolicy } from "@/lib/session";
import type { SessionPolicyInput } from "@/lib/types";
import { IS_MOCK, SESSION_FACTORY_ADDRESS } from "./config";
import { useCollateralAddress, useCollateralDecimals } from "./collateral";

/*
  Write layer over PulseSessionFactory + PulseSession. createSession is a three-signature
  flow (approve the factory -> createSession -> deposit into the returned vault) run as a
  linear async state machine: each step awaits its receipt before the next. When the
  factory is absent or the app is in mock mode every action returns early and
  status.unavailable is true, so components render the not-deployed state instead of
  faking a transaction.
*/

// === Constants

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

// === Types

export type SessionActionPhase =
  "idle" | "approving" | "creating" | "depositing" | "withdrawing" | "disarming" | "done" | "error";

export interface SessionActionStatus {
  phase: SessionActionPhase;
  /* True when this environment has no deployed factory (or is mock): actions no-op. */
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
  const { writeContractAsync } = useWriteContract();

  const unavailable: boolean = !SESSION_FACTORY_ADDRESS || IS_MOCK;

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

          setPhase("approving");
          await send({
            address: token,
            abi: erc20Abi,
            functionName: "approve",
            args: [factory, deposit],
          });

          setPhase("creating");
          await send({
            address: factory,
            abi: pulseSessionFactoryAbi,
            functionName: "createSession",
            args: [toContractPolicy(policy), policy.allowedMarketIds],
          });

          const session = await readSessionAddress();
          if (!session) throw new Error("Session address not found after creation");

          setPhase("depositing");
          await send({
            address: session,
            abi: pulseSessionAbi,
            functionName: "deposit",
            args: [deposit],
          });

          setPhase("done");
          void queryClient.invalidateQueries({ queryKey: ["session", owner] });
        } catch (err) {
          fail(err);
        }
      })();
    },
    [unavailable, owner, decimals, token, send, readSessionAddress, queryClient, fail],
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
        } catch (err) {
          fail(err);
        }
      })();
    },
    [unavailable, readSessionAddress, queryClient, owner, fail],
  );

  const deposit = useCallback(
    (amount: number): void => {
      runOnSession("depositing", (session) =>
        send({
          address: session,
          abi: pulseSessionAbi,
          functionName: "deposit",
          args: [parseUnits(String(amount), decimals)],
        }),
      );
    },
    [runOnSession, send, decimals],
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
