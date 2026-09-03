/*
  The app runs against mock data unless it is explicitly turned off AND the live endpoints
  are configured. The PRD sanctions NEXT_PUBLIC_MOCK for UI work (section 11.7); it must
  never ship enabled. Mock rows are always labelled as sample in the UI.
*/

const explicitlyLive = process.env.NEXT_PUBLIC_MOCK === "0";

const hasLiveEndpoints =
  Boolean(process.env.NEXT_PUBLIC_INDEXER_URL) && Boolean(process.env.NEXT_PUBLIC_WS_RPC_URL);

export const IS_MOCK = !explicitlyLive || !hasLiveEndpoints;

export const SESSION_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_SESSION_FACTORY as
  `0x${string}` | undefined;
