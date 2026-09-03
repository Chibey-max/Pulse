import type { Metadata } from "next";
import { createPublicClient, erc20Abi, formatUnits, http, isAddress, type Address } from "viem";
import { Card, CtaLink, Section, SectionHeading } from "@/components/ui";
import { createPulseExchange } from "@/lib/markets";
import { getCollateral, getPulseChain, getTxUrl, SOMNIA_SHANNON_RPC_URL } from "@/lib/chain";
import { decodeRule, pulseSessionAbi } from "@/lib/session";
import { formatAmount, truncateHex } from "@/lib/format";
import { createMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = createMetadata({
  title: "Session",
  path: "/session",
  noIndex: true,
});

function sideLabel(side: string | null) {
  if (!side) return "Order";
  return side.endsWith("YES") ? "UP" : "DOWN";
}

function orderAction(status: string) {
  if (status === "Cancelled" || status === "Expired") return "Order cancelled";
  if (status === "Filled" || status === "Closed") return "Call filled";
  return "Call placed";
}

async function readPolicyView(session: Address) {
  const chain = getPulseChain();
  const collateral = getCollateral(chain.id);
  const client = createPublicClient({
    chain,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL ?? SOMNIA_SHANNON_RPC_URL),
  });

  try {
    const [policy, armed, windowsUsed, decimals, balance] = await Promise.all([
      client.readContract({
        address: session,
        abi: pulseSessionAbi,
        functionName: "policy",
      }),
      client.readContract({
        address: session,
        abi: pulseSessionAbi,
        functionName: "armed",
      }),
      client.readContract({
        address: session,
        abi: pulseSessionAbi,
        functionName: "windowsUsed",
      }),
      client.readContract({
        address: collateral.address,
        abi: erc20Abi,
        functionName: "decimals",
      }),
      client.readContract({
        address: collateral.address,
        abi: erc20Abi,
        functionName: "balanceOf",
        args: [session],
      }),
    ]);

    return [
      {
        label: "Remaining",
        value: `${formatAmount(Number(formatUnits(balance, decimals)))} ${collateral.symbol}`,
      },
      {
        label: "Max per window",
        value: `${formatAmount(Number(formatUnits(policy[0], decimals)))} ${collateral.symbol}`,
      },
      {
        label: "Windows left",
        value: `${Math.max(0, Number(policy[1]) - Number(windowsUsed))} of ${Number(policy[1])}`,
      },
      { label: "Rule", value: decodeRule(Number(policy[3])) },
      { label: "Armed", value: armed ? "Yes" : "No" },
      { label: "Expiry", value: new Date(Number(policy[2]) * 1000).toLocaleString("en-US") },
    ];
  } catch {
    return null;
  }
}

async function readSessionOrders(session: Address) {
  const exchange = createPulseExchange();
  try {
    return await exchange.client.getOrders(session, { limit: 25 });
  } catch {
    return [];
  }
}

export default async function SessionProofPage({ params }: PageProps<"/session/[address]">) {
  const { address } = await params;
  const validAddress = isAddress(address);
  const session = validAddress ? (address as Address) : null;
  const [policyView, orders] = session
    ? await Promise.all([readPolicyView(session), readSessionOrders(session)])
    : [[], []];

  return (
    <Section id="session-proof" spacing="tight" label="Public session proof">
      <div className="flex max-w-3xl flex-col gap-6">
        <SectionHeading
          id="session-proof"
          as="h1"
          eyebrow="Public proof surface"
          title={`Session ${truncateHex(address)}`}
          description="Read-only live testnet view. Shows the onchain policy, balance, and indexed session order history."
        />

        {session && policyView ? (
          <Card className="grid gap-3 p-6 sm:grid-cols-2">
            {policyView.map((field) => (
              <div
                key={field.label}
                className="border-border bg-bg-elevated flex flex-col gap-1 rounded-lg border p-3"
              >
                <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
                  {field.label}
                </span>
                <span className="text-body font-mono-numbers text-text-primary font-mono">
                  {field.value}
                </span>
              </div>
            ))}
          </Card>
        ) : (
          <Card className="flex flex-col gap-3 p-6">
            <p className="text-body text-text-primary">
              This address is not a readable Pulse session on the configured testnet.
            </p>
            <CtaLink href="/session/new" variant="secondary">
              Open a live session
            </CtaLink>
          </Card>
        )}

        <Card className="flex flex-col gap-3 p-6">
          <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
            Indexed session order history
          </span>
          {orders.length === 0 ? (
            <p className="text-caption text-text-secondary">
              No indexed orders for this session yet. Once the session places calls, real testnet
              transactions will appear here.
            </p>
          ) : (
            <ul className="divide-border flex flex-col divide-y">
              {orders.map((order) => (
                <li key={order.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-caption text-text-primary">
                      {orderAction(order.status)} · {sideLabel(order.side)}
                    </span>
                    <span className="text-micro text-text-muted font-mono tracking-wider uppercase">
                      {order.marketInfo?.asset ?? "Market"} ·{" "}
                      {order.marketInfo?.interval ?? "window"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-pill border-signal/50 bg-signal/10 text-micro text-signal border px-2.5 py-1 font-mono tracking-wider uppercase">
                      session-signed
                    </span>
                    <a
                      href={getTxUrl(order.placedTxHash as `0x${string}`)}
                      className="text-micro font-mono-numbers text-text-secondary hover:text-signal font-mono"
                    >
                      {truncateHex(order.placedTxHash)}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </Section>
  );
}
