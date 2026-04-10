import type { PageServerLoad } from './$types';
import { DEMO_SEQUENCES, DEMO_SIGNALS, DEMO_STATS } from '$lib/demo-data';

export const load: PageServerLoad = async () => {
	return {
		title: 'Demo - ChurnPulse',
		stats: DEMO_STATS,
		signals: DEMO_SIGNALS,
		sequences: DEMO_SEQUENCES,
		connected: true,
		isDemo: true,
		nowIso: new Date().toISOString()
	};
};
