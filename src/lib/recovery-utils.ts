import type { ChurnSignal, SignalType } from '$lib/types';

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low';
export type DriverType = 'payment' | 'cancel' | 'engage' | 'new' | 'price';

export interface ExpansionSignal {
	name: string;
	value: string;
	severity: 'urgent' | 'medium' | 'low' | 'soon';
	pct: number;
}

export interface RecoveryCustomerRow {
	signal: ChurnSignal;
	riskScore: number;
	riskLevel: RiskLevel;
	driver: DriverType;
	driverLabel: string;
	plan: string;
	expansionSignals: ExpansionSignal[];
}

const BASE_SCORES: Record<SignalType, number> = {
	card_failed: 55,
	disengaged: 38,
	downgraded: 52,
	paused: 40,
	cancelled: 78,
	high_mrr_risk: 85,
	trial_ending: 60
};

function readMetadata(signal: ChurnSignal): Record<string, unknown> {
	const metadata = signal.metadata;
	return metadata && typeof metadata === 'object' && !Array.isArray(metadata)
		? (metadata as Record<string, unknown>)
		: {};
}

function readNumber(value: unknown, fallback = 0): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function readPercentLabel(value: unknown, fallback = 40): string {
	const parsed = readNumber(value, fallback);
	return `${Math.round(parsed)}%`;
}

export function computeRiskScore(signal: ChurnSignal): number {
	const base = BASE_SCORES[signal.signal_type] ?? 40;
	const mrrBonus = Math.min(20, Math.round(signal.mrr_amount / 5_000));
	const highValueBonus = signal.mrr_amount > 50_000 ? 12 : 0;
	return Math.min(100, base + mrrBonus + highValueBonus);
}

export function getRiskLevel(score: number): RiskLevel {
	if (score >= 80) {
		return 'critical';
	}

	if (score >= 65) {
		return 'high';
	}

	if (score >= 45) {
		return 'medium';
	}

	return 'low';
}

export function getDriver(signalType: SignalType): { type: DriverType; label: string } {
	if (signalType === 'card_failed') {
		return { type: 'payment', label: 'Payment' };
	}

	if (signalType === 'cancelled' || signalType === 'high_mrr_risk') {
		return { type: 'cancel', label: 'Wants to Cancel' };
	}

	if (signalType === 'disengaged') {
		return { type: 'engage', label: 'Disengaged' };
	}

	if (signalType === 'trial_ending') {
		return { type: 'new', label: 'New Customer' };
	}

	if (signalType === 'downgraded') {
		return { type: 'price', label: 'Price Sensitive' };
	}

	return { type: 'new', label: 'New Customer' };
}

export function getPlan(signal: ChurnSignal): string {
	const metadata = readMetadata(signal);
	const planName = metadata.plan_name;

	if (typeof planName === 'string' && planName.trim()) {
		return planName.trim();
	}

	if (signal.mrr_amount >= 40_000) {
		return 'Enterprise';
	}

	if (signal.mrr_amount >= 14_900) {
		return 'Growth';
	}

	if (signal.mrr_amount >= 4_900) {
		return 'Pro';
	}

	return 'Starter';
}

export function buildExpansionSignals(signal: ChurnSignal): ExpansionSignal[] {
	const metadata = readMetadata(signal);
	const signals: ExpansionSignal[] = [];

	if (signal.signal_type === 'card_failed' || signal.signal_type === 'high_mrr_risk') {
		signals.push({
			name: 'Days overdue',
			value: '12 days',
			severity: 'urgent',
			pct: 80
		});
		signals.push({
			name: 'Failed attempts',
			value: `${Math.max(2, readNumber(metadata.attempt_count, 3))} attempts`,
			severity: 'medium',
			pct: 60
		});
	}

	if (signal.signal_type === 'disengaged') {
		signals.push({
			name: 'Last active',
			value: '18 days ago',
			severity: 'urgent',
			pct: 75
		});
		signals.push({
			name: 'Logins this month',
			value: '0',
			severity: 'medium',
			pct: 0
		});
	}

	if (signal.signal_type === 'downgraded') {
		signals.push({
			name: 'MRR decrease',
			value: readPercentLabel(metadata.percent_decrease, 40),
			severity: 'medium',
			pct: 60
		});
	}

	if (signal.signal_type === 'trial_ending') {
		signals.push({
			name: 'Trial remaining',
			value: '2 days',
			severity: 'soon',
			pct: 65
		});
	}

	signals.push({
		name: 'Subscription age',
		value: '8 months',
		severity: 'low',
		pct: 40
	});
	signals.push({
		name: 'Support tickets',
		value: '2 open',
		severity: 'soon',
		pct: 30
	});

	return signals;
}

export function toRecoveryCustomer(signal: ChurnSignal): RecoveryCustomerRow {
	const riskScore = computeRiskScore(signal);
	const driver = getDriver(signal.signal_type);

	return {
		signal,
		riskScore,
		riskLevel: getRiskLevel(riskScore),
		driver: driver.type,
		driverLabel: driver.label,
		plan: getPlan(signal),
		expansionSignals: buildExpansionSignals(signal)
	};
}
