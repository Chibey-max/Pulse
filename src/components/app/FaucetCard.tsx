"use client";

import {
  MdAccountBalanceWallet,
  MdBolt,
  MdCheckCircle,
  MdOpenInNew,
  MdShield,
  MdWaterDrop,
} from "react-icons/md";
import { useAccount } from "wagmi";
import { Card, CtaButton, CtaLink } from "@/components/ui";
import { ActionStatusNotice } from "@/components/app/ActionStatusNotice";
import { getTxUrl } from "@/lib/chain";
import { useCollateralBalance, useFaucet } from "@/lib/app-data/collateral";
import { cn } from "@/lib/cn";

// === Data

const STEPS = [
  {
    icon: MdBolt,
    label: "STT",
    copy: "Pays gas for wallet confirmations.",
  },
  {
    icon: MdWaterDrop,
    label: "tUSDC",
    copy: "Fake collateral used for calls and sessions.",
  },
  {
    icon: MdShield,
    label: "Risk cap",
    copy: "Only test collateral moves here.",
  },
] as const;

// === Component

interface FaucetCardProps {
  always?: boolean;
}

/*
  Testnet funding station. The mint action is only useful at zero tUSDC, but the card
  stays visible when funded so /faucet never looks like a dead route.
*/
export function FaucetCard({ always = false }: FaucetCardProps) {
  const { isConnected } = useAccount();
  const { formatted, isZero, isLoading } = useCollateralBalance();
  const { mint, status, hash, error } = useFaucet();

  const label =
    status === "pending"
      ? "Confirm in wallet…"
      : status === "confirming"
        ? "Minting…"
        : status === "confirmed"
          ? "Minted"
          : "Mint 10,000 tUSDC";

  const funded = isConnected && !isLoading && !isZero;
  const canMint = isConnected && !isLoading && isZero;

  if (!always && (!isConnected || isLoading || !isZero)) return null;

  return (
    <Card glow className="relative overflow-hidden p-0">
      <div
        aria-hidden="true"
        className="from-signal/20 via-up/10 pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b to-transparent"
      />

      <div className="relative flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="border-signal/30 bg-signal/10 text-signal flex size-10 shrink-0 items-center justify-center rounded-lg border">
              <MdAccountBalanceWallet size={20} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-h3 text-text-primary font-display font-semibold">
                Testnet funding
              </h2>
              <p className="text-caption text-text-secondary max-w-xl">
                The faucet mints fake tUSDC collateral on Somnia Shannon. Use it when your tUSDC
                balance is zero so you can place calls or fund a Pulse session.
              </p>
            </div>
          </div>

          <div
            className={cn(
              "rounded-lg border px-3 py-2 text-right font-mono",
              funded ? "border-up/30 bg-up/10" : "border-border-bright bg-bg-elevated",
            )}
          >
            <p className="text-micro text-text-muted tracking-wider uppercase">Your tUSDC</p>
            <p className="text-body font-mono-numbers text-text-primary">
              {isConnected ? (isLoading ? "Reading..." : formatted) : "Not connected"}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="border-border bg-bg-elevated rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Icon size={15} aria-hidden="true" className="text-signal" />
                  <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
                    {step.label}
                  </span>
                </div>
                <p className="text-caption text-text-secondary">{step.copy}</p>
              </div>
            );
          })}
        </div>

        {!isConnected ? (
          <ActionStatusNotice
            tone="info"
            title="Connect a wallet to read funding state"
            detail="Pulse will show the mint control only if this wallet has zero tUSDC on Somnia Shannon."
          />
        ) : funded ? (
          <ActionStatusNotice
            tone="success"
            title="Wallet already funded"
            detail="You do not need the faucet right now. Your tUSDC balance is enough to open a session or place a direct call."
          />
        ) : canMint ? (
          <ActionStatusNotice
            tone="pending"
            title="tUSDC balance is zero"
            detail="Minting sends one testnet transaction to the collateral faucet."
            hint="Keep a little STT for gas; MetaMask shows your STT balance separately."
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <CtaButton
            variant="primary"
            size="sm"
            onClick={mint}
            disabled={
              !canMint || status === "pending" || status === "confirming" || status === "confirmed"
            }
          >
            {funded ? (
              <>
                <MdCheckCircle size={15} aria-hidden="true" /> Funded
              </>
            ) : (
              label
            )}
          </CtaButton>
          <CtaLink variant="secondary" size="sm" href="/app">
            Open app
          </CtaLink>
          <CtaLink variant="secondary" size="sm" href="/session/new">
            Start session
          </CtaLink>
        </div>

        {hash ? (
          <a
            href={getTxUrl(hash)}
            target="_blank"
            rel="noreferrer"
            className="text-micro text-signal inline-flex items-center gap-1 font-mono tracking-wider uppercase"
          >
            {status === "confirmed" ? "Minted" : "Pending"} transaction
            <MdOpenInNew size={13} aria-hidden="true" />
          </a>
        ) : status === "error" ? (
          <ActionStatusNotice
            tone="error"
            title="Faucet transaction stopped"
            detail={error ?? "Faucet call failed. Try again."}
            hint="Nothing was minted unless a transaction hash appears."
          />
        ) : null}
      </div>
    </Card>
  );
}
