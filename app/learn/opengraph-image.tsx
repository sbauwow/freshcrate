import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Mini Crates — AI & ML Education";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "56px",
          background: "linear-gradient(135deg, #0f3460 0%, #16213e 55%, #1a0a2e 100%)",
          color: "#ffffff",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <div style={{ fontSize: 30, color: "#05ffa1", marginBottom: 16, letterSpacing: 2 }}>
          freshcrate • LEARN
        </div>
        <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.08 }}>Mini Crates 📦</div>
        <div style={{ fontSize: 34, color: "#e0c3fc", marginTop: 16 }}>
          AI &amp; Machine Learning from the ground up
        </div>
        <div style={{ fontSize: 24, color: "#ff71ce", marginTop: 26 }}>
          10 free crates • Starter → Builder → Architect
        </div>
      </div>
    ),
    size
  );
}
