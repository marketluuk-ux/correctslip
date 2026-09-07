import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TIERS: [string, string][] = [
  ["Tier I", "NGN 500"],
  ["Tier II", "NGN 2,000"],
  ["Tier III", "NGN 5,000"],
  ["Tier IV", "NGN 10,000"],
];

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0D2419",
          padding: "72px",
          color: "#E9EEE7",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: "#C4830A" }} />
          <div style={{ fontSize: 26, letterSpacing: 4, fontWeight: 700 }}>CORRECTSLIP</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            maxWidth: 900,
          }}
        >
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.05 }}>
            Football picks,
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              color: "#E8A93B",
            }}
          >
            paid to be right.
          </div>
          <div style={{ display: "flex", fontSize: 27, color: "#9DAB9C", marginTop: 26, maxWidth: 780 }}>
            Four tiers, one free pick a day. Every result stays on the record.
          </div>
        </div>

        <div style={{ display: "flex", gap: 16 }}>
          {TIERS.map(([label, price]) => (
            <div
              key={label}
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "16px 22px",
                borderRadius: 8,
                background: "rgba(233,238,231,0.06)",
                border: "1px solid rgba(233,238,231,0.16)",
              }}
            >
              <div style={{ display: "flex", fontSize: 15, color: "#9DAB9C", letterSpacing: 2 }}>
                {label.toUpperCase()}
              </div>
              <div style={{ display: "flex", fontSize: 25, fontWeight: 700, color: "#F4C874", marginTop: 6 }}>
                {price}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
