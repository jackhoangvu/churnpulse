import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
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
		thresholds: {
			accuracyFloor: {
				label: 'Accuracy Floor',
				desc: 'Alert below 0.65',
				value: 0.65,
				min: 0.4,
				max: 0.9,
				step: 0.01
			},
			predictionAccuracyLimit: {
				label: 'Prediction Accuracy Limit',
				desc: 'Alert above 0.15',
				value: 0.15,
				min: 0.05,
				max: 0.3,
				step: 0.01
			},
			dataStabilityLimit: {
				label: 'Data Stability Limit',
				desc: 'Alert above 0.2',
				value: 0.2,
				min: 0.05,
				max: 0.4,
				step: 0.01
			},
			earlyWarningFloor: {
				label: 'Early Warning Floor',
				desc: 'Alert below 2x',
				value: 2,
				min: 1,
				max: 5,
				step: 0.1,
				suffix: 'x'
			},
			biasAlertLimit: {
				label: 'Bias Alert Limit',
				desc: 'Alert above 3',
				value: 3,
				min: 1,
				max: 10,
				step: 1
			}
		}
	};
};
