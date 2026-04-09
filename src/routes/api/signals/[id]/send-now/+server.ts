import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { admin } from '$lib/server/admin';
import { sendSequenceEmail } from '$lib/server/email-sender';
import { logError } from '$lib/server/logger';
import { resolveOrCreateOrganization } from '$lib/server/organizations';
import { checkRateLimit } from '$lib/server/rate-limiter';
import { scheduleSequence } from '$lib/server/sequences';
import { toSignal } from '$lib/signal-utils';
import type { ChurnSignalRow, SequenceEmailRow } from '$lib/types/supabase';

async function loadSignal(signalId: string, orgId: string) {
	const { data, error } = await admin
		.from('churn_signals')
		.select('*')
		.eq('id', signalId)
		.eq('org_id', orgId)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return data ? toSignal(data as unknown as ChurnSignalRow) : null;
}

async function loadNextPendingEmail(signalId: string, orgId: string): Promise<SequenceEmailRow | null> {
	const { data, error } = await admin
		.from('sequence_emails')
		.select('*')
		.eq('signal_id', signalId)
		.eq('org_id', orgId)
		.eq('status', 'pending')
		.order('step', { ascending: true })
		.limit(1)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return (data as unknown as SequenceEmailRow | null) ?? null;
}

export const POST: RequestHandler = async ({ locals, params }) => {
	if (!locals.session?.userId) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	if (!checkRateLimit(`api:${locals.session.userId}`, 60, 60_000)) {
		return json({ error: 'rate_limited' }, { status: 429 });
	}

	try {
		const organization = await resolveOrCreateOrganization(locals.session);

		if (!organization) {
			return json({ error: 'workspace_not_found' }, { status: 404 });
		}

		const signal = await loadSignal(params.id, organization.id);

		if (!signal) {
			return json({ error: 'signal_not_found' }, { status: 404 });
		}

		let email = await loadNextPendingEmail(signal.id, organization.id);

		if (!email && signal.status === 'detected') {
			await scheduleSequence(signal.id, signal.signal_type, organization);
			email = await loadNextPendingEmail(signal.id, organization.id);
		}

		if (!email) {
			return json({ error: 'no_pending_email' }, { status: 400 });
		}

		await sendSequenceEmail(email.id);

		const updatedEmail = await loadNextPendingEmail(signal.id, organization.id);
		const { data, error } = await admin
			.from('sequence_emails')
			.select('*')
			.eq('id', email.id)
			.maybeSingle();

		if (error) {
			throw error;
		}

		return json({
			sent: true,
			email: (data as unknown as SequenceEmailRow | null) ?? email,
			next_pending_email_id: updatedEmail?.id ?? null
		});
	} catch (error) {
		logError('api.signals.send-now', error, {
			user_id: locals.session.userId,
			signal_id: params.id
		});

		return json({ error: 'internal_error' }, { status: 500 });
	}
};
