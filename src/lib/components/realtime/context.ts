import type { Writable } from 'svelte/store';
import type { OrganizationRow } from '$lib/types/supabase';

export type DashboardUser = {
	id: string;
	email: string | null;
	fullName: string | null;
};

export type DashboardLayoutContext = {
	org: Writable<OrganizationRow | null>;
	user: Writable<DashboardUser | null>;
	isConnected: Writable<boolean>;
	unreadSignalCount: Writable<number>;
};

export const dashboardLayoutContextKey = Symbol('dashboard-layout-context');
