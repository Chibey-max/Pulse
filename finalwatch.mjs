import { createPublicClient, http } from "viem";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { readFileSync, writeFileSync } from "fs";
const P = JSON.parse(readFileSync("/tmp/proof.json", "utf8"));
const pub = createPublicClient({
  chain: somniaShannon,
  transport: http("https://api.infra.testnet.somnia.network"),
});
const ex = new SomniaMarkets({
  chain: somniaShannon,
  addresses: SOMNIA_TESTNET_ADDRESSES,
  indexerUrl: "https://dev.smk.somnia.host/v1/graphql",
  wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
});
const abi = [
  {
    type: "event",
    name: "Redeemed",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "credited", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "RedeemFailed",
    inputs: [
      { name: "marketId", type: "bytes32", indexed: true },
      { name: "reason", type: "bytes" },
    ],
  },
];
const FROM = BigInt(P.fromBlock);
for (let i = 0; i < 180; i++) {
  const to = await pub.getBlockNumber();
  const oc = await ex.client.getMarketOnchain(P.marketId).catch(() => null);
  let ev = [];
  for (let s = FROM; s <= to; s += 1000n) {
    const e = s + 999n < to ? s + 999n : to;
    for (const n of ["Redeemed", "RedeemFailed"]) {
      const l = await pub
        .getContractEvents({ address: P.session, abi, eventName: n, fromBlock: s, toBlock: e })
        .catch(() => []);
      ev.push(...l.map((x) => ({ n, ...x })));
    }
  }
  const left = Number(P.expiry) - Math.floor(Date.now() / 1000);
  console.log(
    `[${i}] ${new Date().toISOString().slice(11, 19)} expiry_in=${left}s finalized=${oc?.finalized} win=${oc?.winningOutcome} events=${ev.length}`,
  );
  if (ev.length) {
    console.log("\n*** VALIDATOR-INVOKED HANDLER FIRED ***");
    const proof = [];
    for (const e of ev) {
      const tx = await pub.getTransaction({ hash: e.transactionHash });
      const rec = {
        event: e.n,
        tx: e.transactionHash,
        block: e.blockNumber.toString(),
        from: tx.from,
        to: tx.to,
        args: JSON.parse(
          JSON.stringify(e.args, (k, v) => (typeof v === "bigint" ? v.toString() : v)),
        ),
      };
      console.log(JSON.stringify(rec, null, 1));
      proof.push(rec);
    }
    writeFileSync(
      "/tmp/handler_proof.json",
      JSON.stringify({ ...P, winningOutcome: oc?.winningOutcome, handler: proof }, null, 1),
    );
    break;
  }
  await new Promise((r) => setTimeout(r, 20000));
}
process.exit(0);
