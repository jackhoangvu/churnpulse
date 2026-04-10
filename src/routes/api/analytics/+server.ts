import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { admin } from '$lib/server/admin';

interface AnalyticsPayload {
	event: string;
	properties?: Record<string, string | number | boolean>;
	session_id?: string;
}

function isValidPayload(body: unknown): body is AnalyticsPayload {
	return (
		typeof body === 'object' &&
		body !== null &&
		typeof (body as Record<string, unknown>).event === 'string'
	);
}

export const POST: RequestHandler = async ({ request }) => {
	const response = json({ ok: true });

	void (async () => {
		try {
			const body = await request.json();
			if (!isValidPayload(body)) {
				return;
			}

			await admin.from('analytics_events').insert({
				event_name: body.event.slice(0, 100),
				properties: (body.properties ?? {}) as Record<string, unknown>,
				session_id: body.session_id?.slice(0, 64) ?? null
			} as never);
		} catch {
			// Analytics writes should never block user-facing work.
		}
	})();

	return response;
};
