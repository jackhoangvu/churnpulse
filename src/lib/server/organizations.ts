import { createHash } from 'node:crypto';
import { admin } from '$lib/server/admin';
import type { OrganizationRow } from '$lib/types/supabase';
import type { DashboardUser } from '$lib/components/realtime/context';

type Session = App.Locals['session'];
const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readClaim(claims: Record<string, unknown>, keys: string[]): string | null {
	for (const key of keys) {
		const value = claims[key];
		if (typeof value === 'string' && value.trim()) {
			return value;
		}
	}

	return null;
}

function inferFullName(claims: Record<string, unknown>): string | null {
	const explicitName = readClaim(claims, ['name', 'full_name', 'fullName']);
	if (explicitName) {
		return explicitName;
	}

	const firstName = readClaim(claims, ['first_name', 'firstName', 'given_name']);
	const lastName = readClaim(claims, ['last_name', 'lastName', 'family_name']);

	if (firstName && lastName) {
		return `${firstName} ${lastName}`;
	}

	return firstName;
}

export function serializeSessionUser(session: Session): DashboardUser | null {
	if (!session?.userId) {
		return null;
	}

	const claims = session.claims ?? {};

	return {
		id: session.userId,
		email: readClaim(claims, [
			'email',
			'email_address',
			'primary_email_address',
			'primaryEmailAddress'
		]),
		fullName: inferFullName(claims)
	};
}

export function toOrganizationUserId(userId: string): string {
	if (UUID_PATTERN.test(userId)) {
		return userId;
	}

	const hash = createHash('sha1').update(`clerk:${userId}`).digest('hex');
	const segment1 = hash.slice(0, 8);
	const segment2 = hash.slice(8, 12);
	const segment3 = `5${hash.slice(13, 16)}`;
	const variantNibble = (parseInt(hash.slice(16, 17), 16) & 0x3) | 0x8;
	const segment4 = `${variantNibble.toString(16)}${hash.slice(17, 20)}`;
	const segment5 = hash.slice(20, 32);

	return `${segment1}-${segment2}-${segment3}-${segment4}-${segment5}`;
}

export function getOrganizationClerkUserId(org: OrganizationRow): string | null {
	const metadata = org.metadata;

	if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
		const clerkUserId = metadata.clerk_user_id;
		if (typeof clerkUserId === 'string' && clerkUserId.trim()) {
			return clerkUserId;
		}
	}

	return UUID_PATTERN.test(org.user_id) ? null : org.user_id;
}

export async function resolveOrganization(userId: string | undefined): Promise<OrganizationRow | null> {
	if (!userId) {
		return null;
	}

	const organizationUserId = toOrganizationUserId(userId);

	const { data, error } = await admin
		.from('organizations')
		.select('*')
		.eq('user_id', organizationUserId)
		.order('created_at', { ascending: true })
		.limit(1)
		.maybeSingle();

	if (error) {
		throw error;
	}

	return (data as unknown as OrganizationRow | null) ?? null;
}

export async function resolveOrCreateOrganization(
	session: Session,
	options: { allowCreate?: boolean } = {}
): Promise<OrganizationRow | null> {
	if (!session?.userId) {
		return null;
	}

	const existing = await resolveOrganization(session.userId);
	if (existing || !options.allowCreate) {
		return existing;
	}

	return createOrganization(session);
}

export async function createOrganization(session: Session): Promise<OrganizationRow | null> {
	if (!session?.userId) {
		return null;
	}

	const user = serializeSessionUser(session);
	const inferredName = user?.fullName
		? `${user.fullName}'s workspace`
		: user?.email
			? `${user.email}'s workspace`
			: 'ChurnPulse workspace';
	const organizationUserId = toOrganizationUserId(session.userId);

	const { data: existingOrganizations, error: existingOrganizationsError } = await admin
		.from('organizations')
		.select('id')
		.eq('user_id', organizationUserId)
		.limit(3);

	if (existingOrganizationsError) {
		throw existingOrganizationsError;
	}

	if ((existingOrganizations?.length ?? 0) >= 3) {
		throw new Error('Organization limit reached');
	}

	const { data, error } = await admin
		.from('organizations')
		.insert({
			user_id: organizationUserId,
			name: inferredName,
			metadata: {
				clerk_user_id: session.userId
			}
		} as never)
		.select('*')
		.maybeSingle();

	if (error) {
		throw error;
	}

	return (data as unknown as OrganizationRow | null) ?? null;
}
