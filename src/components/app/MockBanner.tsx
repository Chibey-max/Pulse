import { MdScience } from "react-icons/md";
import { IS_MOCK_DATA } from "@/lib/app-data";

// === Component

/*
  Rendered whenever the app is reading mock data. Claims discipline: a reviewer must never
  mistake sample rows for a live testnet session.
*/
export function MockBanner() {
  if (!IS_MOCK_DATA) return null;

  return (
    <div className="border-warn/40 bg-warn/8 text-micro text-warn flex items-center gap-2 rounded-lg border px-4 py-2.5 font-mono tracking-wider uppercase">
      <MdScience size={13} aria-hidden="true" />
      Sample data. Configure the indexer and WS endpoints and set NEXT_PUBLIC_MOCK=0 for live
      markets.
    </div>
  );
}
