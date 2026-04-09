import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadDashboardStats } from '$lib/server/dashboard-stats';
import { logError } from '$lib/server/logger';
import { resolveOrCreateOrganization } from '$lib/server/organizations';
import { checkRateLimit } from '$lib/server/rate-limiter';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session?.userId) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}

	if (!checkRateLimit(`api:${locals.session.userId}`, 60, 60_000)) {
		return json({ error: 'rate_limited' }, { status: 429 });
	}

	try {
		const organization = await resolveOrCreateOrganization(locals.session);

		if (!organization?.stripe_account_id) {
			return json(
				{
					connected: false,
					stats: null
				},
				{
					headers: {
						'cache-control': 'max-age=60'
					}
				}
			);
		}

		return json(
			{
				connected: true,
				stats: await loadDashboardStats(organization.id)
			},
			{
				headers: {
					'cache-control': 'max-age=60'
				}
			}
		);
	} catch (error) {
		logError('api.stats', error, {
			user_id: locals.session.userId
		});

		return json({ error: 'internal_error' }, { status: 500 });
	}
};
