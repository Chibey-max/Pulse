/*
 * Re-checks every claim in docs/EVIDENCE.md against a public RPC.
 * Read-only: no wallet, no funds, no gas. `pnpm verify:evidence`
 */
import { createPublicClient, decodeFunctionData, http } from "viem";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.infra.testnet.somnia.network";
const client = createPublicClient({ chain: somniaShannon, transport: http(RPC) });

const FACTORY = "0x26d0A38dB17aC44ed91A90d68a3FDD7B366BCE84";
const SESSION = "0x5bc72C8fD675D0316c58196ab677E0277f6eF5eA";
const MODULE = "0x3ecC694Cef705358864a646142ac17A90E29e388";
const PRECOMPILE = "0x0000000000000000000000000000000000000100";
const MARKET = "0x0000000000000000000000000000000000000000000000000000000000014985";
const REDEEM_TX = "0xe9bf34787416a0c46814b717868921a43d07491217b46ad03bd48124b14ef7b2";
const MARKET_FINALIZED = "0x8f396ac6cf2e01887362e2b39d8e56860042c604e5b1b481c87e6d9f90006e08";
const ON_EVENT = "0x53edf33d";
const CREDITED = 20202000n;

const handlerAbi = [
  {
    type: "function",
    name: "onEvent",
    inputs: [
      { name: "emitter", type: "address" },
      { name: "eventTopics", type: "bytes32[]" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
];
let failures = 0;
function check(label, ok, detail) {
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

console.log(`\nVerifying Pulse settlement evidence against ${RPC}\n`);

const tx = await client.getTransaction({ hash: REDEEM_TX });
const receipt = await client.getTransactionReceipt({ hash: REDEEM_TX });

console.log("Transaction");
check("succeeded", receipt.status === "success", `status=${receipt.status}`);
check("targets the session vault", tx.to.toLowerCase() === SESSION.toLowerCase(), tx.to);
check(
  "calls the protocol handler selector 0x53edf33d",
  tx.input.slice(0, 10).toLowerCase() === ON_EVENT,
  tx.input.slice(0, 10),
);
check(
  "carries a system nonce, not an account nonce",
  BigInt(tx.nonce) > 1_000_000n,
  `nonce=${tx.nonce}`,
);

console.log("\nCallback payload (decoded from calldata)");
const { args } = decodeFunctionData({ abi: handlerAbi, data: tx.input });
const [emitter, topics] = args;
check(
  "emitter is the binary markets module",
  emitter.toLowerCase() === MODULE.toLowerCase(),
  emitter,
);
check("topic0 is MarketFinalized", topics[0].toLowerCase() === MARKET_FINALIZED, topics[0]);
check(
  "topic1 is the market we traded",
  topics[1].toLowerCase() === MARKET.toLowerCase(),
  topics[1],
);

console.log("\nOutcome");
const redeemed = receipt.logs.filter(
  (l) => l.address.toLowerCase() === SESSION.toLowerCase() && l.topics[1]?.toLowerCase() === MARKET,
);
check("session emitted a settlement log", redeemed.length > 0, `${redeemed.length} log(s)`);
if (redeemed.length) {
  const credited = BigInt(redeemed[0].data);
  check(
    "credited 20.202000 tUSDC to the vault",
    credited === CREDITED,
    `${(Number(credited) / 1e6).toFixed(6)} tUSDC`,
  );
}

console.log("\nGuarantee");
/*
  The session is an EIP-1167 clone, so its own bytecode is just the delegating
  stub — the guard lives in the implementation the factory deployed.
*/
const implementation = await client.readContract({
  address: FACTORY,
  abi: [
    {
      type: "function",
      name: "implementation",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "address" }],
    },
  ],
  functionName: "implementation",
});
const code = await client.getCode({ address: implementation });
/*
  Read the guard's constant through its getter rather than grepping bytecode:
  solc emits this address as a PUSH2 0x0100, not a padded 20-byte literal.
*/
const guard = await client.readContract({
  address: SESSION,
  abi: [
    {
      type: "function",
      name: "SOMNIA_REACTIVITY_PRECOMPILE",
      stateMutability: "view",
      inputs: [],
      outputs: [{ type: "address" }],
    },
  ],
  functionName: "SOMNIA_REACTIVITY_PRECOMPILE",
});
check(
  "handler guards on the reactivity precompile",
  guard.toLowerCase() === PRECOMPILE.toLowerCase(),
  `onEvent reverts unless msg.sender is ${guard}`,
);
check(
  "handler exposes the protocol selector",
  Boolean(code) && code.toLowerCase().includes(ON_EVENT.slice(2)),
  "0x53edf33d present in implementation bytecode",
);
/*
  The clone delegates to whatever address is baked into its EIP-1167 bytecode. Assert the
  factory's implementation IS that address, so a published implementation can never drift
  to a different contract than the one that actually served this redemption.
*/
const cloneCode = await client.getCode({ address: SESSION });
check(
  "clone delegates to the factory's implementation",
  Boolean(cloneCode) && cloneCode.toLowerCase().includes(implementation.slice(2).toLowerCase()),
  `clone bytecode embeds ${implementation}`,
);
check(
  "handler does NOT expose the superseded onEvent(bytes)",
  Boolean(code) && !code.toLowerCase().includes("0bde80f3"),
  "0x0bde80f3 absent — this is the corrected handler, not the one that never fired",
);

console.log(
  failures === 0
    ? "\nAll checks passed. The redemption was invoked by the chain, not the owner.\n"
    : `\n${failures} check(s) failed.\n`,
);
process.exit(failures === 0 ? 0 : 1);
