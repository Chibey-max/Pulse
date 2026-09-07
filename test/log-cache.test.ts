import { describe, expect, it } from "vitest";
import { decodeLogs, encodeLogs, getLogsChunked } from "@/lib/app-data/live";

/*
  Covers the two fragile parts of the session-log reader: bigints surviving the
  localStorage round trip, and the backward walk that reclaims history a bounded slice at
  a time instead of scanning ~740k blocks in one burst (which froze the tab).

  Each test uses its own cache key so entries never leak between cases.
*/

interface FakeLog {
  blockNumber: bigint;
  logIndex: number;
}

/* Records every range asked for, so a test can assert what was NOT re-fetched. */
function recorder(logsAt: bigint[] = []) {
  const ranges: Array<[bigint, bigint]> = [];
  const fetchChunk = async (from: bigint, to: bigint): Promise<FakeLog[]> => {
    ranges.push([from, to]);
    return logsAt
      .filter((block) => block >= from && block <= to)
      .map((block) => ({ blockNumber: block, logIndex: 0 }));
  };
  const blocksScanned = () =>
    ranges.reduce((total, [from, to]) => total + Number(to - from) + 1, 0);
  return { ranges, fetchChunk, blocksScanned };
}

describe("log cache bigint codec", () => {
  it("round-trips bigints that JSON would otherwise reject", () => {
    const entry = {
      scannedFrom: BigInt(480_000_000),
      scannedTo: BigInt(481_561_801),
      logs: [{ blockNumber: BigInt(480_821_489), args: { credited: BigInt(20_202_000) } }],
    };

    const restored = decodeLogs(encodeLogs(entry)) as typeof entry;

    expect(restored.scannedFrom).toBe(BigInt(480_000_000));
    expect(restored.scannedTo).toBe(BigInt(481_561_801));
    expect(restored.logs[0].blockNumber).toBe(BigInt(480_821_489));
    expect(restored.logs[0].args.credited).toBe(BigInt(20_202_000));
  });

  it("throws without the codec, which is why it exists", () => {
    expect(() => JSON.stringify({ credited: BigInt(1) })).toThrow();
  });
});

describe("getLogsChunked", () => {
  it("bounds the first scan instead of walking the whole span", async () => {
    const { fetchChunk, blocksScanned } = recorder();
    const from = BigInt(1_000);
    const to = BigInt(741_000); // ~740k blocks, the span that froze the tab

    await getLogsChunked(from, to, fetchChunk, "test:first-scan");

    // 180 chunks x 1000 blocks, not 740k.
    expect(blocksScanned()).toBe(180_000);
  });

  it("re-reads only new blocks on the next poll", async () => {
    const key = "test:forward";
    const first = recorder();
    const from = BigInt(1_000);
    const to = BigInt(200_000);

    await getLogsChunked(from, to, first.fetchChunk, key);

    const second = recorder();
    await getLogsChunked(from, to + BigInt(500), second.fetchChunk, key);

    // Forward delta is 500 new blocks; the rest is a bounded backfill slice, never a rescan.
    const forward = second.ranges.filter(([, end]) => end > to);
    expect(forward.length).toBe(1);
    expect(second.blocksScanned()).toBeLessThan(first.blocksScanned());
  });

  it("walks backward until the full range is covered", async () => {
    const key = "test:backfill";
    const from = BigInt(1);
    const to = BigInt(400_000);

    let earliest = BigInt(0);
    for (let poll = 0; poll < 6; poll++) {
      const { ranges, fetchChunk } = recorder();
      await getLogsChunked(from, to, fetchChunk, key);
      const starts = ranges.map(([start]) => start);
      if (starts.length > 0) {
        const min = starts.reduce((a, b) => (a < b ? a : b));
        earliest = earliest === BigInt(0) || min < earliest ? min : earliest;
      }
    }

    // Started at to-180k (220_000) and reclaimed 60k per poll, so it reaches the floor.
    expect(earliest).toBe(from);
  });

  it("returns logs in block order after merging backfilled history", async () => {
    const key = "test:ordering";
    const from = BigInt(1);
    const to = BigInt(300_000);
    const seeded = [BigInt(250_000), BigInt(150_000), BigInt(50_000)];

    let logs: FakeLog[] = [];
    for (let poll = 0; poll < 5; poll++) {
      const { fetchChunk } = recorder(seeded);
      logs = await getLogsChunked<FakeLog>(from, to, fetchChunk, key);
    }

    const blocks = logs.map((log) => log.blockNumber);
    expect(blocks).toEqual([...blocks].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
    expect(new Set(blocks).size).toBe(blocks.length); // no duplicates across merges
  });
});
