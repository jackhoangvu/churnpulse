<script lang="ts">
	import { page } from '$app/state';
	import AppShell from '$lib/components/layout/AppShell.svelte';
	import SignalFeed from '$lib/components/realtime/SignalFeed.svelte';
	import type { ChurnSignal } from '$lib/types';
	import type { LayoutData } from './$types';

	interface Props {
		data: LayoutData;
		children: import('svelte').Snippet;
	}

	let { data, children }: Props = $props();
	const isOnboardingRoute = $derived(page.url.pathname === '/dashboard/onboarding');
	let unreadSignalCount = $state(0);

	function handleSignal(_signal: ChurnSignal): void {
		if (page.url.pathname.startsWith('/dashboard/recovery')) {
			return;
		}

		unreadSignalCount += 1;
	}

	$effect(() => {
		if (!data.isConnected || page.url.pathname.startsWith('/dashboard/recovery')) {
			unreadSignalCount = 0;
		}
	});
</script>

{#if isOnboardingRoute}
	{@render children()}
{:else}
	<SignalFeed orgId={data.org?.id ?? null} onSignal={handleSignal} />

	<AppShell orgName={data.org?.name ?? 'ChurnPulse workspace'} unreadCount={unreadSignalCount}>
		{#snippet headerActions()}
			<div class="dashboard-header-actions" id="dashboard-header-actions">
				<a class="btn btn-secondary btn-sm" href="/dashboard/playbooks" id="header-playbooks">
					Email Playbooks
				</a>
				<a class="btn btn-primary btn-sm" href="/dashboard/recovery" id="header-recovery">
					Recovery Center
				</a>
			</div>
		{/snippet}

		{@render children()}
	</AppShell>
{/if}
