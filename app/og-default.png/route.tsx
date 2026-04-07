import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#f5f5f0",
          borderTop: "8px solid #006600",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: 72 }}>📦</span>
          <span
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: "#006600",
              fontFamily: "monospace",
            }}
          >
            freshcrate
          </span>
        </div>
        <p
          style={{
            fontSize: 28,
            color: "#666",
            marginTop: 16,
            fontFamily: "monospace",
          }}
        >
          The open source package directory for AI agents
        </p>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
