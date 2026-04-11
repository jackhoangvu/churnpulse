import type { PageServerLoad } from './$types';
import { generateEmailContent } from '$lib/server/email-templates';
import type { SignalType } from '$lib/types';

type TemplateGroup = 'dunning' | 'outreach' | 'recovery';

interface TemplateItem {
	id: string;
	name: string;
	trigger: string;
	group: TemplateGroup;
	groupLabel: string;
	signalType: SignalType;
	step: number;
	variables: string[];
}

const TEMPLATES: TemplateItem[] = [
	{
		id: 'dunning-1',
		name: 'Card Update Request',
		trigger: 'Failed invoice detected (retry 1-2)',
		group: 'dunning',
		groupLabel: 'Dunning',
		signalType: 'card_failed',
		step: 1,
		variables: ['customer_name', 'amount_usd', 'plan_name', 'update_payment_url']
	},
	{
		id: 'dunning-2',
		name: 'Final Notice',
		trigger: 'Failed invoice (retry 3 - last attempt)',
		group: 'dunning',
		groupLabel: 'Dunning',
		signalType: 'card_failed',
		step: 3,
		variables: ['customer_name', 'amount_usd', 'update_payment_url']
	},
	{
		id: 'outreach-1',
		name: 'Payment Issue Outreach',
		trigger: 'Card failed, personalized follow-up',
		group: 'outreach',
		groupLabel: 'Outreach',
		signalType: 'card_failed',
		step: 2,
		variables: ['customer_name', 'support_url']
	},
	{
		id: 'outreach-2',
		name: 'Cancel Save',
		trigger: 'Cancellation detected',
		group: 'outreach',
		groupLabel: 'Outreach',
		signalType: 'cancelled',
		step: 1,
		variables: ['customer_name', 'plan_name']
	},
	{
		id: 'outreach-3',
		name: 'New Customer Check-in',
		trigger: 'Trial ending within 3 days',
		group: 'outreach',
		groupLabel: 'Outreach',
		signalType: 'trial_ending',
		step: 1,
		variables: ['customer_name', 'trial_end_date']
	},
	{
		id: 'recovery-1',
		name: 'Card Update',
		trigger: 'Payment recovery - immediate',
		group: 'recovery',
		groupLabel: 'Recovery',
		signalType: 'card_failed',
		step: 1,
		variables: ['customer_name', 'update_payment_url']
	},
	{
		id: 'recovery-2',
		name: 'Urgent Payment Required',
		trigger: '72h before account pause',
		group: 'recovery',
		groupLabel: 'Recovery',
		signalType: 'card_failed',
		step: 3,
		variables: ['customer_name', 'amount_usd', 'update_payment_url']
	},
	{
		id: 'recovery-3',
		name: 'Final Notice',
		trigger: 'Account pause imminent',
		group: 'recovery',
		groupLabel: 'Recovery',
		signalType: 'cancelled',
		step: 3,
		variables: ['customer_name']
	},
	{
		id: 'recovery-4',
		name: 'Payment Success',
		trigger: 'Payment recovered - thank you',
		group: 'recovery',
		groupLabel: 'Recovery',
		signalType: 'card_failed',
		step: 1,
		variables: ['customer_name', 'plan_name']
	}
];

const SAMPLE_CLASSIFICATION = {
	churn_reason: 'Billing issue preventing continued access to the product.',
	win_back_angle: 'Make payment recovery effortless and empathetic.',
	urgency_score: 8,
	recommended_tone: 'empathetic' as const,
	key_talking_points: ['Clear call to action', 'Empathetic tone', 'Easy payment update']
};

function buildSampleSignal(signalType: SignalType) {
	return {
		id: 'preview',
		org_id: 'preview',
		provider: 'stripe' as const,
		polar_customer_id: 'cus_sample',
		customer_email: 'sarah.chen@growthco.io',
		customer_name: 'Sarah Chen',
		signal_type: signalType,
		mrr_amount: 14_900,
		polar_event_id: null,
		status: 'detected' as const,
		ai_churn_reason: SAMPLE_CLASSIFICATION.churn_reason,
		ai_win_back_angle: SAMPLE_CLASSIFICATION.win_back_angle,
		metadata: { invoice_id: 'in_sample', amount: 14_900, currency: 'usd' },
		detected_at: new Date().toISOString(),
		resolved_at: null
	};
}

export const load: PageServerLoad = async ({ url }) => {
	const selectedId = url.searchParams.get('template') ?? TEMPLATES[0].id;
	const selected = TEMPLATES.find((template) => template.id === selectedId) ?? TEMPLATES[0];
	const content = generateEmailContent({
		signal: buildSampleSignal(selected.signalType),
		step: selected.step,
		classification: SAMPLE_CLASSIFICATION,
		org_name: 'GrowthCo',
		update_card_url: 'https://billing.example.com/update'
	});

	return {
		title: 'Email Playbooks',
		breadcrumb: ['ChurnPulse', 'Email Playbooks'],
		templates: TEMPLATES,
		groups: [
			{
				key: 'dunning' as TemplateGroup,
				label: 'Dunning',
				badge: 'Payment Recovery',
				badgeClass: 'badge-danger'
			},
			{
				key: 'outreach' as TemplateGroup,
				label: 'Outreach',
				badge: 'Retention',
				badgeClass: 'badge-brand'
			},
			{
				key: 'recovery' as TemplateGroup,
				label: 'Recovery',
				badge: 'Advanced',
				badgeClass: 'badge-violet'
			}
		],
		selectedId,
		selected,
		preview: {
			subject: content.subject,
			html: content.html
		}
	};
};
