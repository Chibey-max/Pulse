import { ImageResponse } from "next/og";
import { SITE } from "@/lib/seo";

// === Config

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// === Image

/*
  Static brand card. Deliberately no product mockup or metrics — the marketing pages carry
  the same discipline. Colours mirror the dark theme tokens.
*/
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: "#0a0e17",
        color: "#e9edf6",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 20, height: 44, borderLeft: "5px solid #2fd486" }} />
        <div style={{ width: 20, height: 44, borderRight: "5px solid #2fd486" }} />
        <span style={{ fontSize: 30, letterSpacing: 8, fontWeight: 700, marginLeft: 8 }}>
          PULSE
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <span
          style={{ fontSize: 22, letterSpacing: 4, color: "#4dd0e1", textTransform: "uppercase" }}
        >
          Somnia × DreamDEX Event Contracts
        </span>
        <span style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }}>{SITE.tagline}</span>
      </div>

      <span style={{ fontSize: 22, color: "#9aa6bd" }}>
        Call the next candle. Settlement pays you, with no signature.
      </span>
    </div>,
    size,
  );
}
