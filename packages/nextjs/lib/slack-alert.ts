/**
 * Slack Incoming Webhook notification for new invite requests.
 *
 * Entirely optional — if SLACK_INVITE_ALERT_WEBHOOK_URL isn't set, this is a
 * silent no-op, not an error. Never let a Slack outage affect whether a real
 * request gets saved: failures here are logged and swallowed, not thrown.
 */

import "server-only";

export async function notifyInviteRequest(opts: {
  email: string;
  reason: string | null;
  adminUrl: string;
}): Promise<void> {
  const webhookUrl = process.env.SLACK_INVITE_ALERT_WEBHOOK_URL;
  if (!webhookUrl) return;

  const lines = [
    `📥 New access request: *${opts.email}*`,
    opts.reason ? `> ${opts.reason}` : null,
    `<${opts.adminUrl}|Review in /admin>`,
  ].filter((line): line is string => Boolean(line));

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    });
    if (!res.ok) {
      console.error("[slack-alert] Webhook responded", res.status, await res.text().catch(() => ""));
    }
  } catch (err) {
    console.error("[slack-alert] Failed to notify:", err);
  }
}
