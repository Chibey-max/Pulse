import { somniaMainnet, somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { http, createConfig } from "wagmi";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import { SITE } from "@/lib/seo";

/*
  wagmi config for the app route group only. Deliberately no RainbowKit: the design brief
  calls for a bespoke dark/light identity that a third-party modal cannot match without
  fighting it, the PRD stack lists "wagmi + viem" and not RainbowKit, and Pulse only ever
  targets one chain with a handful of connectors. A small custom WalletButton covers
  connect, wrong-network switch, and disconnect directly against wagmi hooks.
*/

// === Chains

/*
  Shannon testnet is the submission target; mainnet is kept configured so mainnet-ready
  types and a network switch both work without a second config.
*/
export const PULSE_CHAINS = [somniaShannon, somniaMainnet] as const;

// === Connectors

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_ID;

const connectors = [
  injected({ shimDisconnect: true }),
  coinbaseWallet({ appName: SITE.name, preference: "all" }),
  ...(walletConnectProjectId
    ? [walletConnect({ projectId: walletConnectProjectId, showQrModal: true })]
    : []),
];

// === Config

export const wagmiConfig = createConfig({
  chains: PULSE_CHAINS,
  connectors,
  transports: {
    [somniaShannon.id]: http(process.env.NEXT_PUBLIC_RPC_URL),
    [somniaMainnet.id]: http(),
  },
  ssr: true,
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
