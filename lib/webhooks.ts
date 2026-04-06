import { createHmac, randomBytes } from "crypto";
import { getDb } from "./db";

export interface Webhook {
  id: number;
  url: string;
  secret: string;
  events: string;
  active: number;
  failures: number;
  last_triggered_at: string | null;
  created_at: string;
}

export interface WebhookLogEntry {
  id: number;
  webhook_id: number;
  event: string;
  payload: string;
  status_code: number | null;
  response: string | null;
  created_at: string;
}

/**
 * Register a new webhook endpoint.
 * @param url - The URL to POST event payloads to
 * @param events - Comma-separated list of events to subscribe to (default: "new_package,new_release")
 * @param secret - Shared secret for HMAC signature verification; auto-generated if not provided
 * @returns The ID of the newly created webhook
 */
export function registerWebhook(
  url: string,
  events = "new_package,new_release",
  secret?: string
): number {
  const db = getDb();
  const webhookSecret = secret || randomBytes(32).toString("hex");
  const result = db
    .prepare(
      "INSERT INTO webhooks (url, secret, events) VALUES (?, ?, ?)"
    )
    .run(url, webhookSecret, events);
  return result.lastInsertRowid as number;
}

/**
 * List all registered webhooks (both active and inactive).
 * @returns Array of all webhook records
 */
export function listWebhooks(): Webhook[] {
  const db = getDb();
  return db
    .prepare("SELECT * FROM webhooks ORDER BY created_at DESC")
    .all() as Webhook[];
}

/**
 * Remove a webhook by its ID.
 * @param id - The webhook ID to delete
 * @returns true if a webhook was deleted, false if not found
 */
export function removeWebhook(id: number): boolean {
  const db = getDb();
  const result = db.prepare("DELETE FROM webhooks WHERE id = ?").run(id);
  return result.changes > 0;
}

/**
 * Get all active webhooks subscribed to a given event type.
 * @param event - The event name (e.g. "new_package" or "new_release")
 * @returns Array of active webhooks whose events list includes the given event
 */
export function getActiveWebhooks(event: string): Webhook[] {
  const db = getDb();
  // Use LIKE to match the event within the comma-separated events column
  return db
    .prepare(
      "SELECT * FROM webhooks WHERE active = 1 AND (',' || events || ',') LIKE ('%,' || ? || ',%')"
    )
    .all(event) as Webhook[];
}

/**
 * Fire webhooks for a given event. Delivers payloads in parallel using Promise.allSettled.
 *
 * For each active webhook subscribed to the event:
 * - POSTs the JSON payload with Content-Type, X-Freshcrate-Event, and X-Freshcrate-Signature headers
 * - Logs the result (status code and response) in the webhook_log table
 * - Increments the failure counter on HTTP or network errors
 * - Deactivates the webhook after 10 consecutive failures
 * - Resets the failure counter on success
 *
 * @param event - The event name (e.g. "new_package" or "new_release")
 * @param payload - The payload object to serialize and send as JSON
 */
export async function fireWebhooks(
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  const webhooks = getActiveWebhooks(event);
  if (webhooks.length === 0) return;

  const body = JSON.stringify(payload);
  const db = getDb();

  const logStmt = db.prepare(
    "INSERT INTO webhook_log (webhook_id, event, payload, status_code, response) VALUES (?, ?, ?, ?, ?)"
  );
  const successStmt = db.prepare(
    "UPDATE webhooks SET failures = 0, last_triggered_at = datetime('now') WHERE id = ?"
  );
  const failStmt = db.prepare(
    "UPDATE webhooks SET failures = failures + 1, last_triggered_at = datetime('now') WHERE id = ?"
  );
  const deactivateStmt = db.prepare(
    "UPDATE webhooks SET active = 0 WHERE id = ? AND failures >= 10"
  );

  const deliveries = webhooks.map(async (webhook) => {
    const signature = createHmac("sha256", webhook.secret)
      .update(body)
      .digest("hex");

    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Freshcrate-Event": event,
          "X-Freshcrate-Signature": `sha256=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      const responseText = await response.text().catch(() => "");

      logStmt.run(
        webhook.id,
        event,
        body,
        response.status,
        responseText.slice(0, 2000)
      );

      if (response.ok) {
        successStmt.run(webhook.id);
      } else {
        failStmt.run(webhook.id);
        deactivateStmt.run(webhook.id);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error";
      logStmt.run(webhook.id, event, body, null, errorMessage.slice(0, 2000));
      failStmt.run(webhook.id);
      deactivateStmt.run(webhook.id);
    }
  });

  await Promise.allSettled(deliveries);
}

/**
 * Convenience function to fire the 'new_package' event with project data.
 * @param project - The project data to include in the webhook payload
 */
export async function fireNewPackageEvent(
  project: Record<string, unknown>
): Promise<void> {
  await fireWebhooks("new_package", {
    event: "new_package",
    timestamp: new Date().toISOString(),
    project,
  });
}

/**
 * Convenience function to fire the 'new_release' event with project and release data.
 * @param project - The project data to include in the webhook payload
 * @param release - The release data to include in the webhook payload
 */
export async function fireNewReleaseEvent(
  project: Record<string, unknown>,
  release: Record<string, unknown>
): Promise<void> {
  await fireWebhooks("new_release", {
    event: "new_release",
    timestamp: new Date().toISOString(),
    project,
    release,
  });
}
