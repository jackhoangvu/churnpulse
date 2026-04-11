import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { admin } from "$lib/server/admin";

interface AnalyticsPayload {
  event?: string;
  events?: Array<{
    name: string;
    properties?: Record<string, string | number | boolean>;
  }>;
  properties?: Record<string, string | number | boolean>;
  session_id?: string;
}

function isValidPayload(body: unknown): body is AnalyticsPayload {
  return typeof body === "object" && body !== null;
}

export const POST: RequestHandler = async ({ request }) => {
  const response = json({ ok: true });

  void (async () => {
    try {
      const body = await request.json();
      if (!isValidPayload(body)) {
        return;
      }

      const rows =
        Array.isArray(body.events) && body.events.length > 0
          ? body.events
              .filter(
                (
                  entry,
                ): entry is NonNullable<AnalyticsPayload["events"]>[number] =>
                  typeof entry?.name === "string",
              )
              .map((entry) => ({
                event_name: entry.name.slice(0, 100),
                properties: (entry.properties ?? {}) as Record<string, unknown>,
                session_id: body.session_id?.slice(0, 64) ?? null,
              }))
          : typeof body.event === "string"
            ? [
                {
                  event_name: body.event.slice(0, 100),
                  properties: (body.properties ?? {}) as Record<string, unknown>,
                  session_id: body.session_id?.slice(0, 64) ?? null,
                },
              ]
            : [];

      if (rows.length === 0) {
        return;
      }

      await admin.from("analytics_events").insert(rows as never);
    } catch {
      // Analytics writes should never block user-facing work.
    }
  })();

  return response;
};
