<script lang="ts">
	import { setContext } from 'svelte';
	import { page } from '$app/state';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import MobileNav from '$lib/components/layout/MobileNav.svelte';
	import SignalFeed from '$lib/components/realtime/SignalFeed.svelte';
	import {
		dashboardLayoutContextKey,
		type DashboardLayoutContext
	} from '$lib/components/realtime/context';
	import type { LayoutData } from './$types';

	interface Props {
		data: LayoutData;
		children: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();
	const isOnboardingRoute = $derived(page.url.pathname === '/dashboard/onboarding');
	const dashboardContext = $state<DashboardLayoutContext>({
		org: null,
		user: null,
		isConnected: false,
		unreadSignalCount: 0
	});

	setContext(dashboardLayoutContextKey, dashboardContext);

	$effect(() => {
		dashboardContext.org = data.org;
		dashboardContext.user = data.user;
		dashboardContext.isConnected = data.isConnected;

		if (!data.isConnected) {
			dashboardContext.unreadSignalCount = 0;
		}
	});
</script>

{#if isOnboardingRoute}
	{@render children()}
{:else}
	<SignalFeed orgId={data.org?.id ?? null} />

	<AppShell orgName={data.org?.name ?? 'ChurnPulse workspace'}>
		{#snippet headerActions()}
			<div class="dashboard-header-actions" id="dashboard-header-actions">
				<a class="btn btn-secondary btn-sm" href="/dashboard/sequences" id="dashboard-open-sequences">
					Open sequences
				</a>
				<a class="btn btn-primary btn-sm" href="/dashboard/signals" id="dashboard-review-signals">
					Review live signals
				</a>
			</div>
		{/snippet}

		{@render children()}

		<MobileNav unreadCount={dashboardContext.unreadSignalCount} />
	</AppShell>
{/if}
