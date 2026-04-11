import type { PageServerLoad } from './$types';
import {
	MONITORING_THRESHOLD_RULES,
	type MonitoringThresholdKey
} from '$lib/constants';
import { admin } from '$lib/server/admin';
import { resolveOrganization } from '$lib/server/organizations';
import type { Json } from '$lib/types/supabase';

type MonitoringThresholds = Partial<Record<MonitoringThresholdKey, number>>;

function parseMetadata(value: Json | null): { monitoring_thresholds?: MonitoringThresholds } {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}

	return value as { monitoring_thresholds?: MonitoringThresholds };
}

export const load: PageServerLoad = async ({ locals }) => {
	const org = await resolveOrganization(locals.session?.userId);
	let thresholds: Record<MonitoringThresholdKey, (typeof MONITORING_THRESHOLD_RULES)[MonitoringThresholdKey]> = {
		...MONITORING_THRESHOLD_RULES
	};

	if (org) {
		const { data } = await admin
			.from('organizations')
			.select('metadata')
			.eq('id', org.id)
			.maybeSingle();
		const metadata = parseMetadata(
			((data as { metadata: Json | null } | null)?.metadata ?? null) as Json | null
		);

		thresholds = Object.fromEntries(
			(Object.entries(MONITORING_THRESHOLD_RULES) as Array<
				[
					MonitoringThresholdKey,
					(typeof MONITORING_THRESHOLD_RULES)[MonitoringThresholdKey]
				]
			>).map(([key, config]) => [
				key,
				{
					...config,
					value:
						typeof metadata.monitoring_thresholds?.[key] === 'number'
							? metadata.monitoring_thresholds[key]
							: config.value
				}
			])
		) as Record<
			MonitoringThresholdKey,
			(typeof MONITORING_THRESHOLD_RULES)[MonitoringThresholdKey]
		>;
	}

	return {
		title: 'Monitoring',
		breadcrumb: ['ChurnPulse', 'Monitoring'],
		runCount: 7,
		status: 'healthy' as const,
		metrics: {
			accuracy: { value: 0.878, trend: 'up' as const, label: 'Accuracy' },
			predictionAccuracy: {
				value: 0.064,
				trend: 'up' as const,
				label: 'Prediction Accuracy'
			},
			earlyWarning: {
				value: 4.5,
				trend: 'up' as const,
				label: 'Early Warning',
				suffix: 'x'
			},
			dataStability: {
				value: 0.04,
				trend: 'stable' as const,
				label: 'Data Stability'
			}
		},
		trends: {
			accuracy: [0.71, 0.74, 0.78, 0.8, 0.83, 0.85, 0.878],
			predictionAccuracy: [0.09, 0.08, 0.08, 0.07, 0.07, 0.065, 0.064],
			earlyWarning: [2.8, 3.1, 3.4, 3.8, 4, 4.2, 4.5],
			dataStability: [0.09, 0.07, 0.06, 0.05, 0.04, 0.042, 0.04]
		},
		fairness: {
			status: 'no_bias' as const,
			dimensions: ['revenue range', 'customer age', 'plan', 'industry']
		},
		dataHealth: {
			customersScored: 2140,
			cancellationRate: 4.6
		},
		thresholds
	};
};
