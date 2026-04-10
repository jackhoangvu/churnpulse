import type { Organization, SignalType } from '$lib/types';
import { admin } from '$lib/server/admin';
import type { Database, ChurnSignalRow } from '$lib/types/supabase';

const DAY = 24 * 60 * 60 * 1000;

const sequenceConfigs: Record<
	SignalType,
	Array<{ delay: number; step: number; subject_key?: string }>
> = {
	card_failed: [
		{ delay: 0, step: 1, subject_key: 'card_failed_1' },
		{ delay: 1 * DAY, step: 2, subject_key: 'card_failed_2' },
		{ delay: 3 * DAY, step: 3, subject_key: 'card_failed_3' }
	],
	disengaged: [
		{ delay: 0, step: 1 },
		{ delay: 3 * DAY, step: 2 },
		{ delay: 7 * DAY, step: 3 }
	],
	cancelled: [
		{ delay: 0, step: 1 },
		{ delay: 7 * DAY, step: 2 },
		{ delay: 30 * DAY, step: 3 }
	],
	downgraded: [
		{ delay: 0, step: 1 },
		{ delay: 5 * DAY, step: 2 }
	],
	paused: [
		{ delay: 7 * DAY, step: 1 },
		{ delay: 14 * DAY, step: 2 },
		{ delay: 21 * DAY, step: 3 }
	],
	high_mrr_risk: [{ delay: 0, step: 1 }],
	trial_ending: [{ delay: 0, step: 1 }]
};

export async function scheduleSequence(
	signalId: string,
	signalType: SignalType,
	org: Organization
): Promise<void> {
	const { data: signalRow, error: signalError } = await admin
		.from('churn_signals')
		.select('*')
		.eq('id', signalId)
		.maybeSingle();

	if (signalError || !signalRow) {
		throw signalError ?? new Error(`Signal ${signalId} not found`);
	}

	const signal = signalRow as unknown as ChurnSignalRow;
	const steps = sequenceConfigs[signalType];
	const now = Date.now();
	const rows: Database['public']['Tables']['sequence_emails']['Insert'][] = steps.map((step) => ({
		signal_id: signalId,
		org_id: org.id,
		email_to: signal.customer_email ?? 'unknown@example.com',
		step: step.step,
		status: 'pending',
		scheduled_for: new Date(now + step.delay).toISOString()
	}));

	const { error: insertError } = await admin.from('sequence_emails').insert(rows as never);

	if (insertError) {
		throw insertError;
	}

	const { error: updateError } = await admin
		.from('churn_signals')
		.update({
			status: 'sequence_started'
		} as never)
		.eq('id', signalId);

	if (updateError) {
		throw updateError;
	}
}
