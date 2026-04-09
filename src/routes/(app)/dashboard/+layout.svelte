<script lang="ts">
	import { setContext } from 'svelte';
	import { page } from '$app/state';
	import { writable } from 'svelte/store';
	import AppShell from '$lib/components/layout/AppShell.svelte';
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
	const orgStore = writable<LayoutData['org']>(null);
	const userStore = writable<LayoutData['user']>(null);
	const isConnectedStore = writable(false);
	const unreadSignalCountStore = writable(0);
	const dashboardContext: DashboardLayoutContext = {
		org: orgStore,
		user: userStore,
		isConnected: isConnectedStore,
		unreadSignalCount: unreadSignalCountStore
	};

	setContext(dashboardLayoutContextKey, dashboardContext);

	$effect(() => {
		orgStore.set(data.org);
		userStore.set(data.user);
		isConnectedStore.set(data.isConnected);

		if (!data.isConnected) {
			unreadSignalCountStore.set(0);
		}
	});
</script>

{#if isOnboardingRoute}
	{@render children()}
{:else}
	<SignalFeed orgId={data.org?.id ?? null} />

	<AppShell orgName={data.org?.name ?? 'ChurnPulse workspace'}>
		{#snippet headerActions()}
			<div class="flex items-center gap-3">
				<a
					class="border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-accent)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
					href="/dashboard/sequences"
				>
					Open sequences
				</a>
				<a
					class="border border-[var(--accent-cyan-border)] bg-[var(--accent-cyan-dim)] px-3 py-2 text-sm text-[var(--accent-cyan)] transition hover:bg-[rgba(0,229,255,0.22)]"
					href="/dashboard/signals"
				>
					Review live signals
				</a>
			</div>
		{/snippet}

		{@render children()}
	</AppShell>
{/if}
