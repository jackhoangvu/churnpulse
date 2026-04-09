import { createClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { env } from '$lib/env';
import {
	detectCancellation,
	detectCardFailed,
	detectDowngrade,
	detectPause,
	detectTrialEnding
} from '$lib/server/signals';
import { log, logError } from '$lib/server/logger';
import type { Database, ChurnSignalRow, OrganizationRow, SequenceEmailRow } from '$lib/types/supabase';

const admin = createClient<Database, 'public'>(env.supabaseUrl, env.supabaseServiceRoleKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

type ProcessResult = {
	event_generated: string;
	signal_created: boolean;
	sequence_scheduled: boolean;
	org_id: string | null;
	signal_id: string | null;
	skipped?: boolean;
};

function extractMetadata(source: unknown): Record<string, unknown> {
	if (typeof source === 'object' && source !== null) {
		return source as Record<string, unknown>;
	}

	return {};
}

async function hasProcessedStripeEvent(eventId: string): Promise<boolean> {
	const { data, error } = await admin
		.from('churn_signals')
		.select('id')
		.eq('stripe_event_id', eventId)
		.limit(1)
		.maybeSingle();

	if (error) {
		logError('stripe-webhook.idempotency', error, { stripe_event_id: eventId });
		return false;
	}

	return Boolean(data);
}

async function resolveOrganizationForEvent(event: Stripe.Event): Promise<OrganizationRow | null> {
	if (event.account) {
		const { data } = await admin
			.from('organizations')
			.select('*')
			.eq('stripe_account_id', event.account)
			.maybeSingle();
		const organization = data as unknown as OrganizationRow | null;

		if (organization) {
			return organization;
		}
	}

	const objectData = extractMetadata(event.data.object);
	const metadata = extractMetadata(objectData.metadata);
	const orgId =
		typeof metadata.org_id === 'string' && metadata.org_id.trim().length > 0 ? metadata.org_id : null;

	if (!orgId) {
		return null;
	}

	const { data } = await admin.from('organizations').select('*').eq('id', orgId).maybeSingle();
	return data as unknown as OrganizationRow | null;
}

async function getSignalForEvent(eventId: string): Promise<ChurnSignalRow | null> {
	const { data, error } = await admin
		.from('churn_signals')
		.select('*')
		.eq('stripe_event_id', eventId)
		.order('detected_at', { ascending: false })
		.limit(1)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return (data as unknown as ChurnSignalRow | null) ?? null;
}

async function getSequenceScheduled(signalId: string): Promise<boolean> {
	const { data, error } = await admin.from('sequence_emails').select('id').eq('signal_id', signalId).limit(1);

	if (error) {
		throw error;
	}

	return ((data as unknown as Pick<SequenceEmailRow, 'id'>[] | null) ?? []).length > 0;
}

async function dispatchSignalDetection(event: Stripe.Event, organization: OrganizationRow): Promise<void> {
	if (event.type === 'invoice.payment_failed') {
		await detectCardFailed(event, organization);
		return;
	}

	if (event.type === 'customer.subscription.updated') {
		await detectDowngrade(event, organization);
		return;
	}

	if (event.type === 'customer.subscription.paused') {
		await detectPause(event, organization);
		return;
	}

	if (event.type === 'customer.subscription.deleted') {
		await detectCancellation(event, organization);
		return;
	}

	if (event.type === 'customer.subscription.trial_will_end') {
		await detectTrialEnding(event, organization);
	}
}

function createsSignal(eventType: string): boolean {
	return (
		eventType === 'invoice.payment_failed' ||
		eventType === 'customer.subscription.updated' ||
		eventType === 'customer.subscription.paused' ||
		eventType === 'customer.subscription.deleted' ||
		eventType === 'customer.subscription.trial_will_end'
	);
}

export async function processStripeEvent(event: Stripe.Event): Promise<ProcessResult> {
	if (await hasProcessedStripeEvent(event.id)) {
		log('info', 'stripe-webhook', 'Skipping duplicate Stripe event', {
			stripe_event_id: event.id
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
		log('warn', 'stripe-webhook', 'No matching organization found for Stripe event', {
			stripe_event_id: event.id,
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

	if (!createsSignal(event.type)) {
		log('info', 'stripe-webhook', 'Event ignored because it does not create a churn signal', {
			org_id: organization.id,
			stripe_event_id: event.id,
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

	try {
		await dispatchSignalDetection(event, organization);
	} catch (error) {
		logError('stripe-webhook.process', error, {
			org_id: organization.id,
			stripe_event_id: event.id,
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

	const signal = await getSignalForEvent(event.id);

	if (!signal) {
		return {
			event_generated: event.type,
			signal_created: false,
			sequence_scheduled: false,
			org_id: organization.id,
			signal_id: null
		};
	}

	const sequenceScheduled = await getSequenceScheduled(signal.id);

	return {
		event_generated: event.type,
		signal_created: true,
		sequence_scheduled: sequenceScheduled,
		org_id: organization.id,
		signal_id: signal.id
	};
}

export async function stripeEventAlreadyProcessed(eventId: string): Promise<boolean> {
	return hasProcessedStripeEvent(eventId);
}
