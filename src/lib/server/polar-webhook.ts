import { admin } from '$lib/server/admin';
import { log, logError } from '$lib/server/logger';
import { normalizePolarEvent } from '$lib/server/normalizer';
import { processNormalizedEvent } from '$lib/server/unified-detector';
import type { Organization } from '$lib/types';
import type { OrganizationRow } from '$lib/types/supabase';

type PolarLikeEvent = {
	id: string;
	type: string;
	account?: string | null;
	data?: {
		object?: unknown;
	};
};

export type ProcessResult = {
	event_generated: string;
	signal_created: boolean;
	sequence_scheduled: boolean;
	org_id: string | null;
	signal_id: string | null;
	skipped?: boolean;
};

function extractRecord(value: unknown): Record<string, unknown> {
	return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function extractOrgIdFromMetadata(event: PolarLikeEvent): string | null {
	const objectData = extractRecord(event.data?.object);
	const metadata = extractRecord(objectData.metadata);
	return typeof metadata.org_id === 'string' && metadata.org_id.trim() ? metadata.org_id : null;
}

async function resolveOrganizationForEvent(event: PolarLikeEvent): Promise<OrganizationRow | null> {
	if (typeof event.account === 'string' && event.account.trim()) {
		const { data, error } = await admin
			.from('organizations')
			.select('*')
			.eq('polar_account_id', event.account)
			.maybeSingle();

		if (error) {
			throw error;
		}

		if (data) {
			return data as unknown as OrganizationRow;
		}
	}

	const orgId = extractOrgIdFromMetadata(event);
	if (!orgId) {
		return null;
	}

	const { data, error } = await admin
		.from('organizations')
		.select('*')
		.eq('id', orgId)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return (data as unknown as OrganizationRow | null) ?? null;
}

export async function polarEventAlreadyProcessed(eventId: string): Promise<boolean> {
	const { data, error } = await admin
		.from('provider_events')
		.select('id')
		.eq('provider', 'polar')
		.eq('event_id', eventId)
		.limit(1)
		.maybeSingle();

	if (error) {
		logError('polar-webhook.idempotency', error, { polar_event_id: eventId });
		return false;
	}

	return Boolean(data);
}

export async function processPolarEvent(event: PolarLikeEvent): Promise<ProcessResult> {
	if (await polarEventAlreadyProcessed(event.id)) {
		log('info', 'polar-webhook', 'Skipping duplicate Polar event', {
			polar_event_id: event.id
		});

		return {
			event_generated: event.type,
			signal_created: false,
			sequence_scheduled: false,
			org_id: null,
			signal_id: null,
			skipped: true
		};
	}

	const organization = await resolveOrganizationForEvent(event);
	if (!organization) {
		log('warn', 'polar-webhook', 'No matching organization found for Polar event', {
			polar_event_id: event.id,
			event_type: event.type,
			account: event.account ?? null
		});

		return {
			event_generated: event.type,
			signal_created: false,
			sequence_scheduled: false,
			org_id: null,
			signal_id: null
		};
	}

	const normalized = normalizePolarEvent(event as unknown as Record<string, unknown>);
	if (!normalized) {
		return {
			event_generated: event.type,
			signal_created: false,
			sequence_scheduled: false,
			org_id: organization.id,
			signal_id: null
		};
	}

	try {
		const result = await processNormalizedEvent(
			normalized,
			organization as unknown as Organization
		);

		return {
			event_generated: event.type,
			signal_created: result.signal_created,
			sequence_scheduled: result.signal_created,
			org_id: organization.id,
			signal_id: result.signal_id
		};
	} catch (caughtError) {
		logError('polar-webhook.process', caughtError, {
			org_id: organization.id,
			polar_event_id: event.id,
			event_type: event.type
		});

		return {
			event_generated: event.type,
			signal_created: false,
			sequence_scheduled: false,
			org_id: organization.id,
			signal_id: null
		};
	}
}

export async function stripeEventAlreadyProcessed(eventId: string): Promise<boolean> {
	return polarEventAlreadyProcessed(eventId);
}
