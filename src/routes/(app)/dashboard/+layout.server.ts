import type { LayoutServerLoad } from './$types';
import { resolveOrCreateOrganization, serializeSessionUser } from '$lib/server/organizations';

export const load: LayoutServerLoad = async ({ locals }) => {
	const org = await resolveOrCreateOrganization(locals.session);
	const user = serializeSessionUser(locals.session);

	return {
		org,
		user,
		isConnected: Boolean(org?.stripe_account_id)
	};
};
