import type { LayoutServerLoad } from './$types';
import { organizationHasActiveProvider } from '$lib/provider-utils';
import { resolveOrCreateOrganization, serializeSessionUser } from '$lib/server/organizations';

export const load: LayoutServerLoad = async ({ locals }) => {
	const org = await resolveOrCreateOrganization(locals.session);
	const user = serializeSessionUser(locals.session);

	return {
		org,
		user,
		isConnected: Boolean(org && (org.polar_organization_id || organizationHasActiveProvider(org.providers)))
	};
};
