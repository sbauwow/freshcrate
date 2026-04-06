/**
 * Email notification for package submissions.
 *
 * Uses a simple HTTPS form endpoint (Formspree, Web3Forms, etc.)
 * or falls back to logging if no email service is configured.
 *
 * Set these env vars:
 *   ADMIN_EMAIL        — where to send notifications
 *   EMAIL_API_KEY      — API key for the email service
 *   EMAIL_API_ENDPOINT — POST endpoint (default: Web3Forms)
 */

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const EMAIL_API_KEY = process.env.EMAIL_API_KEY || "";
const EMAIL_API_ENDPOINT = process.env.EMAIL_API_ENDPOINT || "https://api.web3forms.com/submit";

interface Submission {
  name: string;
  short_desc: string;
  description: string;
  homepage_url: string;
  repo_url: string;
  license: string;
  category: string;
  author: string;
  version: string;
  changes: string;
  tags: string[];
}

export async function sendSubmissionEmail(submission: Submission): Promise<void> {
  const subject = `[freshcrate] New submission: ${submission.name} v${submission.version}`;

  const body = [
    `New package submission on freshcrate`,
    ``,
    `Name:        ${submission.name}`,
    `Version:     ${submission.version}`,
    `Author:      ${submission.author}`,
    `Category:    ${submission.category}`,
    `License:     ${submission.license}`,
    `Description: ${submission.short_desc}`,
    ``,
    `Homepage:    ${submission.homepage_url || "(none)"}`,
    `Repository:  ${submission.repo_url || "(none)"}`,
    `Tags:        ${submission.tags.join(", ") || "(none)"}`,
    ``,
    `Changes:`,
    submission.changes || "(none)",
    ``,
    `Full description:`,
    submission.description || "(none)",
    ``,
    `---`,
    `To publish, run the populate pipeline or add manually.`,
  ].join("\n");

  // If email service is configured, send via API
  if (ADMIN_EMAIL && EMAIL_API_KEY) {
    try {
      const res = await fetch(EMAIL_API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key: EMAIL_API_KEY,
          to: ADMIN_EMAIL,
          subject,
          message: body,
          from_name: "freshcrate",
        }),
      });

      if (!res.ok) {
        console.error(`Email send failed: ${res.status} ${await res.text()}`);
      }
    } catch (err) {
      console.error("Email send error:", err);
    }
    return;
  }

  // Fallback: log to console (always works, visible in Vercel/Railway logs)
  console.log("=== PACKAGE SUBMISSION ===");
  console.log(`To: ${ADMIN_EMAIL || "(ADMIN_EMAIL not set)"}`);
  console.log(`Subject: ${subject}`);
  console.log(body);
  console.log("=== END SUBMISSION ===");
}
