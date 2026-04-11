import { ImageResponse } from "next/og";
import { getCrate } from "@/lib/learn-content";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const crate = getCrate(slug);

  if (!crate) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#16213e",
            color: "white",
            fontSize: 56,
            fontWeight: 700,
            fontFamily: "Arial, sans-serif",
          }}
        >
          Crate not found
        </div>
      ),
      size
    );
  }

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
        <div style={{ fontSize: 28, color: "#05ffa1", marginBottom: 16, letterSpacing: 1 }}>
          freshcrate • Mini Crates
        </div>
        <div style={{ fontSize: 38, color: "#ff71ce", marginBottom: 8 }}>
          {crate.emoji} Crate #{crate.number}
        </div>
        <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1.08 }}>{crate.title}</div>
        <div style={{ fontSize: 30, color: "#e0c3fc", marginTop: 16 }}>{crate.subtitle}</div>
        <div style={{ fontSize: 22, color: "#05ffa1", marginTop: 24 }}>
          ~{crate.estimatedMinutes} min • {crate.tags.slice(0, 3).join(" • ")}
        </div>
      </div>
    ),
    size
  );
}
