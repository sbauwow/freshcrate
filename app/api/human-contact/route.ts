import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { log } from "@/lib/logger";
import { logRequest } from "@/lib/request-log";

const bodySchema = z.object({
  tab: z.enum(["suggest", "report"]),
  type: z.string().trim().max(100).optional(),
  url: z.string().trim().min(1).max(500),
  message: z.string().trim().max(5000).optional(),
  page: z.string().trim().max(100).optional(),
});

function buildEmail(payload: z.infer<typeof bodySchema>) {
  const subject =
    payload.tab === "suggest"
      ? `[freshcrate] package suggestion: ${payload.url}`
      : `[freshcrate] issue report: ${payload.type || "other"}`;

  const lines =
    payload.tab === "suggest"
      ? [
          "Type: package suggestion",
          `Page: ${payload.page || "/submit"}`,
          `URL/Repo: ${payload.url}`,
          "",
          "Why list it:",
          payload.message || "(none)",
        ]
      : [
          "Type: issue report",
          `Page: ${payload.page || "/submit"}`,
          `Issue kind: ${payload.type || "other"}`,
          `Package/URL: ${payload.url}`,
          "",
          "Details:",
          payload.message || "(none)",
        ];

  return { subject, text: lines.join("\n") };
}

async function sendWithResend(to: string, subject: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false as const, reason: "missing_resend_key" };
  }

  const from = process.env.FRESHCRATE_CONTACT_FROM || "freshcrate <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    return { ok: false as const, reason: "resend_error", status: res.status, body };
  }

  return { ok: true as const };
}

export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      const res = NextResponse.json({ error: "Invalid submission payload." }, { status: 400 });
      logRequest(request, 400, start);
      return res;
    }

    const to = process.env.HUMAN_CONTACT_EMAIL || process.env.ADMIN_EMAIL || "contact@freshcrate.ai";
    const email = buildEmail(parsed.data);

    const send = await sendWithResend(to, email.subject, email.text);
    if (!send.ok) {
      log.error("human_contact_send_failed", { reason: send.reason, status: (send as { status?: number }).status });
      const res = NextResponse.json(
        { error: "Contact inbox is not configured yet. Set RESEND_API_KEY and HUMAN_CONTACT_EMAIL." },
        { status: 503 }
      );
      logRequest(request, 503, start);
      return res;
    }

    log.info("human_contact_sent", {
      tab: parsed.data.tab,
      type: parsed.data.type,
      to,
    });

    const res = NextResponse.json({ ok: true }, { status: 202 });
    logRequest(request, 202, start);
    return res;
  } catch (err) {
    log.error("human_contact_error", { error: (err as Error).message });
    const res = NextResponse.json({ error: "Failed to process request." }, { status: 500 });
    logRequest(request, 500, start);
    return res;
  }
}
