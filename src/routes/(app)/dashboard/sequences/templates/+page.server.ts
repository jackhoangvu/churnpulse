import type { PageServerLoad } from './$types';
import { generateEmailContent } from '$lib/server/email-templates';
import { SIGNAL_CONFIGS, type ChurnSignal, type SignalType } from '$lib/types';

type TemplateDefinition = {
	signalType: SignalType;
	step: number;
};

const templateDefinitions: TemplateDefinition[] = [
	{ signalType: 'card_failed', step: 1 },
	{ signalType: 'card_failed', step: 2 },
	{ signalType: 'card_failed', step: 3 },
	{ signalType: 'disengaged', step: 1 },
	{ signalType: 'disengaged', step: 2 },
	{ signalType: 'disengaged', step: 3 },
	{ signalType: 'cancelled', step: 1 },
	{ signalType: 'cancelled', step: 2 },
	{ signalType: 'cancelled', step: 3 },
	{ signalType: 'downgraded', step: 1 },
	{ signalType: 'paused', step: 1 },
	{ signalType: 'high_mrr_risk', step: 1 },
	{ signalType: 'trial_ending', step: 1 }
];

function buildSampleSignal(signalType: SignalType): ChurnSignal {
	return {
		id: `sample-${signalType}`,
		org_id: 'sample-org',
		provider: 'polar',
		polar_customer_id: 'cus_sample',
		customer_email: 'operator@example.com',
		customer_name: 'Northstar Labs',
		signal_type: signalType,
		mrr_amount: signalType === 'high_mrr_risk' ? 890000 : 24900,
		polar_event_id: null,
		status: 'detected',
		ai_churn_reason:
			signalType === 'card_failed'
				? 'The customer is probably blocked by a billing issue rather than true churn intent.'
				: 'The customer is drifting away from value and needs a relevant, timely reason to re-engage.',
		ai_win_back_angle:
			signalType === 'high_mrr_risk'
				? 'Lead with business impact, hands-on support, and a short path back to confidence.'
				: 'Reduce friction, acknowledge the signal clearly, and reconnect them to immediate value.',
		metadata: {
			source: 'template-preview',
			workspace: 'Northstar Labs'
		},
		detected_at: new Date().toISOString(),
		resolved_at: null
	};
}

const sampleClassification = {
	churn_reason: 'The customer is experiencing enough friction that waiting longer increases the odds of silent churn.',
	win_back_angle: 'Acknowledge the issue directly, offer a fast resolution, and make the next step feel low effort.',
	urgency_score: 7,
	recommended_tone: 'empathetic' as const,
	key_talking_points: [
		'Reference the exact signal so the message feels timely.',
		'Reduce the effort required to recover.',
		'Reconnect the account to a clear customer outcome.'
	]
};

export const load: PageServerLoad = async () => {
	const templates = templateDefinitions.map((definition) => {
		const signal = buildSampleSignal(definition.signalType);
		const content = generateEmailContent({
			signal,
			step: definition.step,
			classification: sampleClassification,
			org_name: 'Northstar Labs',
			update_card_url: 'https://billing.example.com/update'
		});

		return {
			id: `${definition.signalType}-${definition.step}`,
			signalType: definition.signalType,
			signalLabel: SIGNAL_CONFIGS[definition.signalType].label,
			step: definition.step,
			subject: content.subject,
			html: content.html
		};
	});

	return {
		title: 'Sequence Templates',
		breadcrumb: ['ChurnPulse', 'Sequences', 'Templates'],
		templates
	};
};
