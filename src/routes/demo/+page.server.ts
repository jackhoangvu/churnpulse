import type { PageServerLoad } from './$types';
import { DEMO_SIGNALS, DEMO_STATS } from '$lib/demo-data';
import { toRecoveryCustomer } from '$lib/recovery-utils';

export const load: PageServerLoad = async ({ url }) => {
	const customers = DEMO_SIGNALS.map(toRecoveryCustomer).sort((left, right) => right.riskScore - left.riskScore);
	const paymentCustomers = customers.filter((customer) => customer.driver === 'payment');
	const cancelCustomers = customers.filter((customer) => customer.driver === 'cancel');
	const highValueCustomers = customers.filter((customer) => customer.signal.mrr_amount > 50_000);

	return {
		title: 'Live Demo',
		breadcrumb: ['ChurnPulse', 'Live Demo'],
		tab: url.searchParams.get('tab') ?? 'recovery',
		customers,
		stats: DEMO_STATS,
		totals: {
			payment: paymentCustomers.length,
			cancel: cancelCustomers.length,
			highValue: highValueCustomers.length,
			paymentMrr: paymentCustomers.reduce((sum, customer) => sum + customer.signal.mrr_amount, 0),
			cancelMrr: cancelCustomers.reduce((sum, customer) => sum + customer.signal.mrr_amount, 0),
			highMrr: highValueCustomers.reduce((sum, customer) => sum + customer.signal.mrr_amount, 0)
		}
	};
};
