<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import StatusDot from '$lib/components/ui/StatusDot.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const currencyFormatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	});

	const providerColors: Record<string, string> = {
		stripe: '#635BFF',
		paddle: '#0EA5E9',
		lemonsqueezy: '#FFC233',
		polar: '#4F6EF7'
	};

	function formatCurrency(cents: number): string {
		return currencyFormatter.format(cents / 100);
	}

	function relativeTime(iso: string): string {
		const diff = Date.now() - new Date(iso).getTime();
		const hours = Math.floor(diff / 3_600_000);
		const days = Math.floor(diff / 86_400_000);

		if (hours < 1) {
			return 'Just now';
		}

		if (hours < 24) {
			return `${hours}h ago`;
		}

		return `${days}d ago`;
	}
</script>

<svelte:head>
	<title>Live Demo - ChurnPulse</title>
	<meta
		name="description"
		content="See ChurnPulse in action with realistic sample data across Stripe, Paddle, Lemon Squeezy, and Polar."
	/>
</svelte:head>

<div class="demo-banner" id="demo-banner" role="banner">
	<div class="demo-banner__inner" id="demo-banner-inner">
		<span class="demo-banner__label" id="demo-banner-label">DEMO MODE</span>
		<p class="demo-banner__copy" id="demo-banner-copy">
			This is sample data showing ChurnPulse monitoring signals across all 4 billing platforms.
		</p>
		<a class="btn btn-primary btn-sm" href="/sign-up" id="demo-signup-cta">Start free -&gt;</a>
	</div>
</div>

<section class="dashboard-page" id="demo-dashboard">
	<div class="dashboard-page__metrics" id="demo-metrics">
		<article class="dashboard-page__metric-card card stat-card" id="demo-metric-atrisk">
			<p class="dashboard-page__metric-label stat-card__label" id="demo-metric-atrisk-label">
				At Risk MRR
			</p>
			<p
				class="dashboard-page__metric-value stat-card__value dashboard-page__metric-value--danger"
				id="demo-metric-atrisk-value"
			>
				{formatCurrency(data.stats.atRiskMrr)}
			</p>
			<p class="dashboard-page__metric-delta stat-card__delta" id="demo-metric-atrisk-delta">
				+$23,400 vs last week
			</p>
		</article>

		<article class="dashboard-page__metric-card card stat-card" id="demo-metric-recovered">
			<p
				class="dashboard-page__metric-label stat-card__label"
				id="demo-metric-recovered-label"
			>
				Recovered MRR
			</p>
			<p
				class="dashboard-page__metric-value stat-card__value dashboard-page__metric-value--success"
				id="demo-metric-recovered-value"
			>
				{formatCurrency(data.stats.recoveredMrr)}
			</p>
			<p
				class="dashboard-page__metric-delta stat-card__delta"
				id="demo-metric-recovered-delta"
			>
				+$1,200 vs last week
			</p>
		</article>

		<article class="dashboard-page__metric-card card stat-card" id="demo-metric-active">
			<p class="dashboard-page__metric-label stat-card__label" id="demo-metric-active-label">
				Active Signals
			</p>
			<p class="dashboard-page__metric-value stat-card__value" id="demo-metric-active-value">
				{data.stats.activeSignals}
			</p>
			<p class="dashboard-page__metric-delta stat-card__delta" id="demo-metric-active-delta">
				+2 vs last week
			</p>
		</article>

		<article class="dashboard-page__metric-card card stat-card" id="demo-metric-recovery">
			<p
				class="dashboard-page__metric-label stat-card__label"
				id="demo-metric-recovery-label"
			>
				Recovery Rate
			</p>
			<p
				class="dashboard-page__metric-value stat-card__value dashboard-page__metric-value--success"
				id="demo-metric-recovery-value"
			>
				{data.stats.recoveryRate}%
			</p>
			<p class="dashboard-page__metric-delta stat-card__delta" id="demo-metric-recovery-delta">
				+12 pts vs last week
			</p>
		</article>
	</div>

	<section class="dashboard-page__signals card" id="demo-signals">
		<div class="dashboard-page__signals-header" id="demo-signals-header">
			<p class="section-label" id="demo-signals-label">Live signals - all platforms</p>
			<div class="demo-platform-legend" id="demo-platform-legend" aria-label="Platform legend">
				{#each Object.entries(providerColors) as [provider, color] (provider)}
					<span
						class="demo-platform-pill"
						style={`--pill-color: ${color}`}
						id={`legend-${provider}`}
					>
						{provider}
					</span>
				{/each}
			</div>
		</div>

		<div class="dashboard-page__table-wrap" id="demo-signals-wrap">
			<table class="dashboard-page__table" id="demo-signals-table">
				<thead class="dashboard-page__table-head" id="demo-signals-head">
					<tr class="dashboard-page__table-row" id="demo-signals-head-row">
						<th class="dashboard-page__table-heading" id="demo-head-customer">Customer</th>
						<th class="dashboard-page__table-heading" id="demo-head-platform">Platform</th>
						<th class="dashboard-page__table-heading" id="demo-head-signal">Signal</th>
						<th
							class="dashboard-page__table-heading dashboard-page__align-right"
							id="demo-head-mrr"
						>
							MRR
						</th>
						<th class="dashboard-page__table-heading" id="demo-head-detected">Detected</th>
						<th class="dashboard-page__table-heading" id="demo-head-status">Status</th>
					</tr>
				</thead>
				<tbody class="dashboard-page__table-body" id="demo-signals-body">
					{#each data.signals as signal (signal.id)}
						<tr class="dashboard-page__table-row" id={`demo-row-${signal.id}`}>
							<td class="dashboard-page__table-cell" id={`demo-customer-${signal.id}`}>
								<div class="dashboard-page__customer" id={`demo-customer-block-${signal.id}`}>
									<p
										class="dashboard-page__customer-name"
										id={`demo-customer-name-${signal.id}`}
									>
										{signal.customer_name}
									</p>
									<p
										class="dashboard-page__customer-email"
										id={`demo-customer-email-${signal.id}`}
									>
										{signal.customer_email}
									</p>
								</div>
							</td>
							<td class="dashboard-page__table-cell" id={`demo-provider-${signal.id}`}>
								<span
									class="demo-provider-badge"
									style={`--pill-color: ${providerColors[signal.provider] ?? '#888'}`}
									id={`provider-badge-${signal.id}`}
								>
									{signal.provider}
								</span>
							</td>
							<td class="dashboard-page__table-cell" id={`demo-signal-${signal.id}`}>
								<Badge type={signal.signal_type} size="sm" />
							</td>
							<td
								class="dashboard-page__table-cell dashboard-page__align-right font-mono"
								id={`demo-mrr-${signal.id}`}
							>
								{formatCurrency(signal.mrr_amount)}
							</td>
							<td class="dashboard-page__table-cell" id={`demo-detected-${signal.id}`}>
								{relativeTime(signal.detected_at)}
							</td>
							<td class="dashboard-page__table-cell" id={`demo-status-${signal.id}`}>
								<div class="dashboard-page__status" id={`demo-status-block-${signal.id}`}>
									<StatusDot status={signal.status} />
									<span class="dashboard-page__status-label" id={`demo-status-label-${signal.id}`}>
										{signal.status.replaceAll('_', ' ')}
									</span>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="demo-cta-section card card-brand" id="demo-cta">
		<h2 class="demo-cta-section__title" id="demo-cta-title">
			Ready to monitor your real accounts?
		</h2>
		<p class="demo-cta-section__desc" id="demo-cta-desc">
			Connect Stripe, Paddle, Lemon Squeezy, or Polar in 60 seconds. ChurnPulse starts
			watching for signals immediately.
		</p>
		<div class="demo-cta-section__actions" id="demo-cta-actions">
			<a class="btn btn-primary btn-lg" href="/sign-up" id="demo-cta-signup">
				Start free - no credit card
			</a>
			<a class="btn btn-ghost btn-lg" href="/#pricing" id="demo-cta-pricing">View pricing</a>
		</div>
	</section>
</section>
