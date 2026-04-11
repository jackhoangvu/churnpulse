let sessionId: string | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const pendingEvents: Array<{
	name: string;
	properties: Record<string, string | number | boolean>;
}> = [];

function getSessionId(): string {
	if (!sessionId) {
		sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	}

	return sessionId;
}

export function trackEvent(
	name: string,
	properties?: Record<string, string | number | boolean>
): void {
	if (typeof navigator === 'undefined' || !navigator.sendBeacon) {
		return;
	}

	pendingEvents.push({
		name,
		properties: properties ?? {}
	});

	if (flushTimer) {
		clearTimeout(flushTimer);
	}

	flushTimer = setTimeout(() => {
		const batch = pendingEvents.splice(0);

		if (batch.length === 0) {
			return;
		}

		const payload = JSON.stringify({
			events: batch,
			session_id: getSessionId()
		});

		navigator.sendBeacon('/api/analytics', new Blob([payload], { type: 'application/json' }));
	}, 100);
}
