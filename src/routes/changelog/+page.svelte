<script lang="ts">
	import PublicSiteShell from '$lib/components/marketing/PublicSiteShell.svelte';

	const releases = [
		{
			version: 'v0.4.0',
			date: 'April 2026',
			isLatest: true,
			changes: [
				{
					type: 'New',
					items: [
						'Multi-platform support: Stripe, Paddle, and Lemon Squeezy now supported alongside Polar',
						'Trial ending signal type - fires 3 days before trial expires',
						'Live demo at /demo - explore ChurnPulse with sample data before connecting',
						'Integrations tab in Settings - manage all 4 billing platforms from one place',
						'Provider event log - full audit trail of every processed webhook'
					]
				},
				{
					type: 'Improved',
					items: [
						'Signal normalizer abstraction - identical detection logic regardless of billing platform',
						'Mobile layout - bottom navigation, touch-optimized cards, iOS safe area support',
						'PWA support - install ChurnPulse to your home screen',
						'Documentation page - complete setup guide for all 4 platforms'
					]
				},
				{
					type: 'Fixed',
					items: [
						'Dedup window now correctly handles trial_ending signals (3-day window)',
						'Supabase Realtime reconnects on visibility change without duplicate subscriptions'
					]
				}
			]
		},
		{
			version: 'v0.3.0',
			date: 'March 2026',
			isLatest: false,
			changes: [
				{
					type: 'New',
					items: [
						'AI-powered churn classification using Claude claude-sonnet-4-20250514',
						'Win-back angle recommendations per signal type',
						'Urgency scoring (1-10) for triage prioritization'
					]
				},
				{
					type: 'Improved',
					items: [
						'Email templates now use AI churn_reason and win_back_angle for personalized copy',
						'Settings page: Sequences tab with per-signal enable/disable toggles'
					]
				},
				{
					type: 'Fixed',
					items: ['High MRR alert was firing for dismissed signals - now correctly checks status']
				}
			]
		},
		{
			version: 'v0.2.0',
			date: 'February 2026',
			isLatest: false,
			changes: [
				{
					type: 'New',
					items: [
						'Email sequence engine: 3-step recovery sequences per signal type',
						'Sequence scheduling via Trigger.dev background jobs',
						'Sequences page with upcoming/sent/failed tabs and filter controls',
						'Email template preview library'
					]
				},
				{
					type: 'Improved',
					items: [
						'Dashboard sparkline now shows 7-day activity with SVG polyline',
						'Signal detail page: timeline view of all sequence emails'
					]
				}
			]
		},
		{
			version: 'v0.1.0',
			date: 'January 2026',
			isLatest: false,
			changes: [
				{
					type: 'New',
					items: [
						'Initial beta: Polar OAuth Connect integration',
						'Signal detection for card_failed, disengaged, downgraded, paused, cancelled, high_mrr_risk',
						'Real-time dashboard with Supabase Realtime signal feed',
						'Clerk authentication with Google OAuth'
					]
				}
			]
		}
	] as const;

	const typeColors = {
		New: 'badge-success',
		Improved: 'badge-brand',
		Fixed: 'badge-warning'
	} as const;
</script>

<svelte:head>
	<title>Changelog - ChurnPulse</title>
	<meta
		name="description"
		content="What's new in ChurnPulse - multi-platform churn prevention for SaaS."
	/>
</svelte:head>

<PublicSiteShell
	eyebrow="Changelog"
	title="What's new in ChurnPulse"
	description="Feature releases, improvements, and fixes - shipped in public."
>
	<div class="changelog-list" id="changelog-list">
		{#each releases as release (release.version)}
			<article class="changelog-entry card" id={`changelog-${release.version.replaceAll('.', '-')}`}>
				<header class="changelog-entry__header" id={`changelog-header-${release.version}`}>
					<div class="changelog-entry__meta" id={`changelog-meta-${release.version}`}>
						<span class="changelog-entry__version font-mono" id={`${release.version}-version`}>
							{release.version}
						</span>
						{#if release.isLatest}
							<span class="badge badge-brand" id={`latest-badge-${release.version}`}>Latest</span>
						{/if}
					</div>
					<span class="changelog-entry__date text-muted font-mono" id={`${release.version}-date`}>
						{release.date}
					</span>
				</header>

				{#each release.changes as group (group.type)}
					<div class="changelog-group" id={`${release.version}-${group.type.toLowerCase()}`}>
						<span class={`badge ${typeColors[group.type]} changelog-group__type-badge`} id={`${release.version}-${group.type.toLowerCase()}-badge`}>
							{group.type}
						</span>
						<ul class="changelog-group__list" id={`${release.version}-${group.type.toLowerCase()}-list`}>
							{#each group.items as item (item)}
								<li class="changelog-group__item" id={`${release.version}-${group.type.toLowerCase()}-${item.slice(0, 12).replaceAll(' ', '-').toLowerCase()}`}>
									{item}
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</article>
		{/each}
	</div>
</PublicSiteShell>
