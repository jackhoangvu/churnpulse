let sessionId: string | null = null;

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

	const payload = JSON.stringify({
		event: name,
		properties: properties ?? {},
		session_id: getSessionId()
	});

	navigator.sendBeacon(
		'/api/analytics',
		new Blob([payload], { type: 'application/json' })
	);
}
