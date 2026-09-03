"use client";

import { useCallback, useRef, useState } from "react";
import {
  MdKeyboardArrowDown,
  MdLogout,
  MdAccountBalanceWallet,
  MdContentCopy,
  MdCheck,
} from "react-icons/md";
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { CtaButton } from "@/components/ui";
import { useClickOutside } from "@/hooks";
import { PULSE_CHAINS } from "@/lib/wagmi";
import { cn } from "@/lib/cn";

// === Helpers

function truncate(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const TARGET_CHAIN = PULSE_CHAINS[0];

// === Component

/*
  Minimal custom connect control against wagmi hooks. Covers the three states the PRD
  requires: disconnected (connector picker), wrong network (switch prompt), connected
  (address + disconnect). Deliberately not RainbowKit - see src/lib/wagmi.ts.
*/
export function WalletButton() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [menu, setMenu] = useState<"none" | "connect" | "account">("none");
  const [copied, setCopied] = useState<boolean>(false);
  const connectRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => setMenu("none"), []);
  useClickOutside(connectRef, menu === "connect", closeMenu);
  useClickOutside(accountRef, menu === "account", closeMenu);

  async function copyAddress(): Promise<void> {
    await navigator.clipboard.writeText(address ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1_500);
  }

  if (!isConnected || !address) {
    return (
      <div ref={connectRef} className="relative">
        <CtaButton
          variant="primary"
          size="sm"
          onClick={() => setMenu((value) => (value === "connect" ? "none" : "connect"))}
          aria-haspopup="menu"
          aria-expanded={menu === "connect"}
          disabled={isPending}
        >
          <MdAccountBalanceWallet size={14} aria-hidden="true" />
          {isPending ? "Connecting..." : "Connect wallet"}
        </CtaButton>

        {menu === "connect" ? (
          <ul
            role="menu"
            className="border-border-bright bg-bg-panel shadow-nav absolute top-full right-0 z-50 flex w-56 flex-col gap-1 rounded-xl border p-1"
          >
            {connectors.map((connector) => (
              <li key={connector.uid} role="none">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    connect({ connector });
                    setMenu("none");
                  }}
                  className="text-caption text-text-secondary hover:bg-bg-elevated hover:text-text-primary flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
                >
                  {connector.name}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  if (chainId !== TARGET_CHAIN.id) {
    return (
      <CtaButton
        variant="secondary"
        size="sm"
        onClick={() => switchChain({ chainId: TARGET_CHAIN.id })}
        disabled={isSwitching}
        className="border-warn/50 text-warn"
      >
        {isSwitching ? "Switching..." : `Switch to ${TARGET_CHAIN.name}`}
      </CtaButton>
    );
  }

  return (
    <div ref={accountRef} className="relative">
      <button
        type="button"
        onClick={() => setMenu((value) => (value === "account" ? "none" : "account"))}
        aria-haspopup="menu"
        aria-expanded={menu === "account"}
        className="rounded-pill border-border-bright bg-bg-panel text-caption text-text-primary hover:border-text-muted inline-flex items-center gap-2 border px-3 py-1.5 font-mono transition-colors"
      >
        <span aria-hidden="true" className="bg-up size-1.5 rounded-full" />
        {truncate(address)}
        <MdKeyboardArrowDown
          size={13}
          aria-hidden="true"
          className={cn("text-text-muted transition-transform", menu === "account" && "rotate-180")}
        />
      </button>

      {menu === "account" ? (
        <div
          role="menu"
          className="border-border-bright bg-bg-panel shadow-nav absolute top-full right-0 z-50 flex w-48 flex-col gap-1 rounded-xl border p-1"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void copyAddress()}
            className="text-caption text-text-secondary hover:bg-bg-elevated hover:text-text-primary flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
          >
            {copied ? (
              <MdCheck size={14} aria-hidden="true" className="text-up" />
            ) : (
              <MdContentCopy size={14} aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy address"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              disconnect();
              setMenu("none");
            }}
            className="text-caption text-text-secondary hover:bg-bg-elevated hover:text-down flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors"
          >
            <MdLogout size={14} aria-hidden="true" />
            Disconnect
          </button>
        </div>
      ) : null}
    </div>
  );
}
