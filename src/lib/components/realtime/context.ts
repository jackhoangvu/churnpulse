import type { OrganizationRow } from '$lib/types/supabase';

export type DashboardUser = {
	id: string;
	email: string | null;
	fullName: string | null;
};

export type DashboardLayoutContext = {
	org: OrganizationRow | null;
	user: DashboardUser | null;
	isConnected: boolean;
	unreadSignalCount: number;
};

export const dashboardLayoutContextKey = Symbol('dashboard-layout-context');
