import Anthropic from '@anthropic-ai/sdk';
import type { Message } from '@anthropic-ai/sdk/resources/messages/messages';
import { env } from '$lib/env';
import type { ChurnSignal, SignalType } from '$lib/types';

export type AIClassification = {
	churn_reason: string;
	win_back_angle: string;
	urgency_score: number;
	recommended_tone: 'empathetic' | 'urgent' | 'value_focused' | 'gentle';
	key_talking_points: string[];
};

const MODEL = 'claude-sonnet-4-20250514';
const SYSTEM_PROMPT =
	'You are a SaaS churn prevention expert. You analyze customer churn signals and recommend win-back strategies. Always respond in valid JSON only.';

const anthropic = new Anthropic({
	apiKey: env.anthropicApiKey
});

const TONE_BY_SIGNAL: Record<
	SignalType,
	AIClassification['recommended_tone']
> = {
	card_failed: 'empathetic',
	cancelled: 'gentle',
	disengaged: 'gentle',
	downgraded: 'value_focused',
	high_mrr_risk: 'urgent',
	paused: 'empathetic',
	trial_ending: 'gentle'
};

const URGENCY_BY_SIGNAL: Record<SignalType, number> = {
	card_failed: 9,
	cancelled: 7,
	disengaged: 5,
	downgraded: 6,
	high_mrr_risk: 10,
	paused: 4,
	trial_ending: 8
};

function serializeError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

function safeMetadataString(metadata: ChurnSignal['metadata']): string {
	try {
		return JSON.stringify(metadata ?? {});
	} catch {
		return '{}';
	}
}

function fallbackClassification(signal: ChurnSignal): AIClassification {
	const tone = TONE_BY_SIGNAL[signal.signal_type];
	const urgency = URGENCY_BY_SIGNAL[signal.signal_type];

	return {
		churn_reason:
			signal.signal_type === 'card_failed'
				? 'The customer is most likely blocked by a billing issue such as an expired card, a bank decline, or a stale payment method.'
				: signal.signal_type === 'disengaged'
					? 'The customer appears to be losing momentum and may not be seeing enough immediate value in the product.'
					: signal.signal_type === 'downgraded'
						? 'The customer is actively reducing spend, which usually signals a mismatch between perceived value and plan cost.'
						: signal.signal_type === 'paused'
							? 'The customer has intentionally stepped back for now, which often means timing or priority has shifted rather than interest disappearing.'
							: signal.signal_type === 'cancelled'
								? 'The customer has already made a churn decision, likely because the product no longer felt essential or urgent enough to keep paying for.'
								: signal.signal_type === 'trial_ending'
									? 'The customer is nearing the end of a free trial without enough conviction to convert, which usually points to incomplete activation or unresolved value questions.'
									: 'This looks like a high-value account showing strong churn risk signals and likely needs personal intervention before renewal confidence drops further.',
		win_back_angle:
			signal.signal_type === 'card_failed'
				? 'Make the recovery effortless, reassure them access is protected, and give them a direct path to update billing in under a minute.'
				: signal.signal_type === 'disengaged'
					? 'Reconnect the customer to a concrete outcome they have not reached yet and offer light-touch help to get them there quickly.'
					: signal.signal_type === 'downgraded'
						? 'Reframe the value they can still unlock and learn which capabilities matter most before they shrink further.'
						: signal.signal_type === 'paused'
							? 'Remind them what they are missing while making reactivation feel simple, low-friction, and completely on their terms.'
							: signal.signal_type === 'cancelled'
								? 'Lead with respect, ask for honest feedback, and reopen the conversation only if there is a credible reason to return.'
								: signal.signal_type === 'trial_ending'
									? 'Reinforce the clearest outcome they can unlock by converting now and offer help removing any final blocker before the trial expires.'
								: 'Use a founder-level, human message focused on business impact, white-glove support, and a clear path back to value.',
		urgency_score: urgency,
		recommended_tone: tone,
		key_talking_points: [
			'Lead with the specific signal so the message feels timely.',
			'Reduce friction around the next action the customer should take.',
			'Tie the outreach to a concrete customer outcome rather than generic retention language.'
		]
	};
}

function extractTextFromMessage(message: Message): string {
	return message.content
		.filter((block) => block.type === 'text')
		.map((block) => block.text)
		.join('\n')
		.trim();
}

function extractJsonCandidate(content: string): string {
	const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);

	if (fencedMatch?.[1]) {
		return fencedMatch[1].trim();
	}

	const firstBrace = content.indexOf('{');
	const lastBrace = content.lastIndexOf('}');

	if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
		return content.slice(firstBrace, lastBrace + 1);
	}

	return content;
}

function isRecommendedTone(value: unknown): value is AIClassification['recommended_tone'] {
	return value === 'empathetic' || value === 'urgent' || value === 'value_focused' || value === 'gentle';
}

function normalizeTalkingPoints(value: unknown): string[] | null {
	if (!Array.isArray(value)) {
		return null;
	}

	const points = value
		.filter((item): item is string => typeof item === 'string')
		.map((item) => item.trim())
		.filter(Boolean)
		.slice(0, 5);

	return points.length >= 3 ? points : null;
}

function normalizeClassification(parsed: unknown, signal: ChurnSignal): AIClassification | null {
	if (!parsed || typeof parsed !== 'object') {
		return null;
	}

	const candidate = parsed as Record<string, unknown>;
	const churnReason =
		typeof candidate.churn_reason === 'string' ? candidate.churn_reason.trim() : '';
	const winBackAngle =
		typeof candidate.win_back_angle === 'string' ? candidate.win_back_angle.trim() : '';
	const urgencyScore = Number(candidate.urgency_score);
	const recommendedTone = candidate.recommended_tone;
	const keyTalkingPoints = normalizeTalkingPoints(candidate.key_talking_points);

	if (
		!churnReason ||
		!winBackAngle ||
		!Number.isFinite(urgencyScore) ||
		!isRecommendedTone(recommendedTone) ||
		!keyTalkingPoints
	) {
		return null;
	}

	return {
		churn_reason: churnReason,
		win_back_angle: winBackAngle,
		urgency_score: Math.max(1, Math.min(10, Math.round(urgencyScore))),
		recommended_tone: recommendedTone,
		key_talking_points: keyTalkingPoints
	};
}

function buildPrompt(signal: ChurnSignal): string {
	const customerName = signal.customer_name ?? 'Unknown customer';
	const customerEmail = signal.customer_email ?? 'No email on file';
	const monthlyValue = (signal.mrr_amount / 100).toFixed(2);

	return `Analyze this churn signal and provide win-back recommendations.
Customer: ${customerName} (${customerEmail})
Signal type: ${signal.signal_type}
MRR value: $${monthlyValue}/month
Time detected: ${signal.detected_at}
Additional context: ${safeMetadataString(signal.metadata)}
Classify this signal and provide:
1. The most likely reason for churn (1-2 sentences, specific)
2. The best win-back angle for this specific customer and signal
3. Urgency score 1-10 (10 = act within hours)
4. Recommended email tone
5. 3-5 key talking points for the win-back email
Respond ONLY with valid JSON matching the schema exactly.`;
}

export async function classifyChurnSignal(signal: ChurnSignal): Promise<AIClassification> {
	const fallback = fallbackClassification(signal);

	try {
		const response = await anthropic.messages.create({
			model: MODEL,
			max_tokens: 600,
			stream: false,
			system: SYSTEM_PROMPT,
			messages: [
				{
					role: 'user',
					content: buildPrompt(signal)
				}
			]
		});

		const responseText = extractTextFromMessage(response);
		const parsed = JSON.parse(extractJsonCandidate(responseText)) as unknown;
		const normalized = normalizeClassification(parsed, signal);

		if (!normalized) {
			console.error({
				job: 'classify-churn-signal',
				error: 'Invalid Claude JSON schema',
				signal_id: signal.id
			});

			return fallback;
		}

		return normalized;
	} catch (error) {
		console.error({
			job: 'classify-churn-signal',
			error: serializeError(error),
			signal_id: signal.id
		});

		return fallback;
	}
}
