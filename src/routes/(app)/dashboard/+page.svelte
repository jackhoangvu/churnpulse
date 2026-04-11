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

	const sparkline = $derived(data.stats?.sparkline ?? []);
	const recentSignals = $derived(data.stats?.recentSignals ?? []);
	const sparklinePoints = $derived.by(() => {
		if (sparkline.length === 0) {
			return '';
		}

		const width = 320;
		const height = 84;
		const max = Math.max(...sparkline.map((point) => point.count), 1);

		return sparkline
			.map((point, index) => {
				const x = (index / Math.max(1, sparkline.length - 1)) * width;
				const y = height - (point.count / max) * height;
				return `${x},${y}`;
			})
			.join(' ');
	});

	function formatCurrency(cents: number): string {
		return currencyFormatter.format(cents / 100);
	}

	function formatRelativeTime(iso: string): string {
		const delta = Date.now() - new Date(iso).getTime();
		const minutes = Math.floor(delta / 60_000);
		const hours = Math.floor(delta / 3_600_000);
		const days = Math.floor(delta / 86_400_000);

		if (minutes < 1) {
			return 'Just now';
		}

		if (hours < 1) {
			return `${minutes}m ago`;
		}

		if (hours < 24) {
			return `${hours}h ago`;
		}

		return `${days}d ago`;
	}
</script>

<svelte:head>
	<title>Dashboard | ChurnPulse</title>
	<meta
		name="description"
		content="Overview of revenue at risk, recovery performance, and recent churn signals across your connected ChurnPulse workspace."
	/>
</svelte:head>

{#if !data.connected || !data.stats}
	<section class="page dashboard-overview dashboard-overview--empty" id="dashboard-page">
		<div class="card card-brand onboarding-empty-state" id="dashboard-connect-card">
			<div class="onboarding-empty-state__hero" id="dashboard-empty-hero">
				<div class="onboarding-empty-state__icon" id="dashboard-connect-icon" aria-hidden="true">
				<svg
					class="onboarding-empty-state__icon-svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					id="dashboard-connect-icon-svg"
				>
					<path class="onboarding-empty-state__icon-path" d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"></path>
				</svg>
				</div>
				<h1 class="onboarding-empty-state__title" id="dashboard-connect-title">Welcome to ChurnPulse</h1>
				<p class="onboarding-empty-state__copy" id="dashboard-connect-copy">
					Connect your billing platform to start detecting churn signals and automating recovery sequences.
				</p>
			</div>

			<div class="onboarding-empty-state__steps" id="dashboard-empty-steps">
				<div class="onboarding-empty-step" id="dashboard-empty-step-1">
					<span class="onboarding-empty-step__num" id="dashboard-empty-step-num-1">1</span>
					<div class="onboarding-empty-step__copy" id="dashboard-empty-step-copy-1">
						<strong class="onboarding-empty-step__title">Connect your billing platform</strong>
						<p class="onboarding-empty-step__text">Read-only OAuth access. Takes about 60 seconds.</p>
					</div>
				</div>
				<div class="onboarding-empty-step" id="dashboard-empty-step-2">
					<span class="onboarding-empty-step__num" id="dashboard-empty-step-num-2">2</span>
					<div class="onboarding-empty-step__copy" id="dashboard-empty-step-copy-2">
						<strong class="onboarding-empty-step__title">ChurnPulse detects signals automatically</strong>
						<p class="onboarding-empty-step__text">Card failures, cancellations, downgrades, pauses, and trial risk.</p>
					</div>
				</div>
				<div class="onboarding-empty-step" id="dashboard-empty-step-3">
					<span class="onboarding-empty-step__num" id="dashboard-empty-step-num-3">3</span>
					<div class="onboarding-empty-step__copy" id="dashboard-empty-step-copy-3">
						<strong class="onboarding-empty-step__title">Recovery emails launch automatically</strong>
						<p class="onboarding-empty-step__text">Review the queue, intervene manually, or let sequences run.</p>
					</div>
				</div>
			</div>

			<div class="onboarding-empty-state__actions" id="dashboard-empty-actions">
				<a class="btn btn-primary btn-lg" href="/api/polar/connect" id="dashboard-connect-button">
					Connect Polar
				</a>
				<a class="btn btn-secondary btn-sm" href="/demo" id="dashboard-demo-button">See live demo</a>
			</div>
		</div>
	</section>
{:else}
	<section class="page dashboard-overview" id="dashboard-page">
		<div class="page__header" id="dashboard-header">
			<div class="page__header-copy" id="dashboard-header-copy">
				<p class="page-kicker" id="dashboard-kicker">Control Center</p>
				<h1 class="page__title" id="dashboard-title">Dashboard</h1>
				<p class="page__subtitle" id="dashboard-subtitle">
					At-risk revenue, recoveries, and recent churn signals across the last 30 days.
				</p>
			</div>
			<span class="page__header-badge" id="dashboard-header-badge">
				{data.stats.scheduledToday} scheduled today
			</span>
		</div>

		<div class="grid-4" id="dashboard-stats">
			<div class="stat-card" id="dashboard-stat-at-risk">
				<p class="stat-card__label" id="dashboard-stat-at-risk-label">At-Risk MRR</p>
				<p class="stat-card__value stat-card__value--danger" id="dashboard-stat-at-risk-value">
					{formatCurrency(data.stats.atRiskMrr)}
				</p>
				<p class="stat-card__trend" id="dashboard-stat-at-risk-trend">
					{data.stats.weekDeltas.atRiskMrr >= 0 ? '+' : '-'}{formatCurrency(Math.abs(data.stats.weekDeltas.atRiskMrr))} vs last week
				</p>
			</div>
			<div class="stat-card" id="dashboard-stat-recovered">
				<p class="stat-card__label" id="dashboard-stat-recovered-label">Recovered MRR</p>
				<p class="stat-card__value stat-card__value--success" id="dashboard-stat-recovered-value">
					{formatCurrency(data.stats.recoveredMrr)}
				</p>
				<p class="stat-card__trend stat-card__trend--up" id="dashboard-stat-recovered-trend">
					Recovery rate {data.stats.recoveryRate}%
				</p>
			</div>
			<div class="stat-card" id="dashboard-stat-active">
				<p class="stat-card__label" id="dashboard-stat-active-label">Active Signals</p>
				<p class="stat-card__value" id="dashboard-stat-active-value">{data.stats.activeSignals}</p>
				<p class="stat-card__trend" id="dashboard-stat-active-trend">
					{data.stats.totalDetected} detected in the last 30 days
				</p>
			</div>
			<div class="stat-card" id="dashboard-stat-scheduled">
				<p class="stat-card__label" id="dashboard-stat-scheduled-label">Scheduled Today</p>
				<p class="stat-card__value stat-card__value--brand" id="dashboard-stat-scheduled-value">
					{data.stats.scheduledToday}
				</p>
				<p class="stat-card__trend" id="dashboard-stat-scheduled-trend">
					Recovery emails queued for delivery
				</p>
			</div>
		</div>

		<div class="grid-2" id="dashboard-panels">
			<div class="chart-card" id="dashboard-activity-card">
				<div class="chart-card__header" id="dashboard-activity-header">
					<div class="chart-card__header-copy" id="dashboard-activity-copy">
						<h2 class="chart-card__title" id="dashboard-activity-title">Signal Activity</h2>
						<p class="chart-card__subtitle" id="dashboard-activity-subtitle">Last 7 days</p>
					</div>
				</div>
				<div class="dashboard-overview__sparkline" id="dashboard-sparkline-wrap">
					<svg class="sparkline-svg" viewBox="0 0 320 84" aria-hidden="true" id="dashboard-sparkline">
						<polyline class="sparkline-line" points={sparklinePoints}></polyline>
					</svg>
				</div>
				<div class="dashboard-overview__sparkline-labels" id="dashboard-sparkline-labels">
					{#each sparkline as point (point.date)}
						<span class="dashboard-overview__sparkline-label" id={`dashboard-sparkline-label-${point.date}`}>{point.label}</span>
					{/each}
				</div>
			</div>

			<div class="chart-card" id="dashboard-breakdown-card">
				<div class="chart-card__header" id="dashboard-breakdown-header">
					<div class="chart-card__header-copy" id="dashboard-breakdown-copy">
						<h2 class="chart-card__title" id="dashboard-breakdown-title">Signal Breakdown</h2>
						<p class="chart-card__subtitle" id="dashboard-breakdown-subtitle">By signal type</p>
					</div>
				</div>
				<div class="bar-chart" id="dashboard-breakdown-chart">
					{#each Object.entries(data.stats.countsBySignalType) as [type, count] (type)}
						<div class="bar-chart__row dashboard-overview__breakdown-row" id={`dashboard-breakdown-row-${type}`}>
							<span class="bar-chart__label" id={`dashboard-breakdown-label-${type}`}>{type.replaceAll('_', ' ')}</span>
							<div class="bar-chart__track" id={`dashboard-breakdown-track-${type}`}>
								<div
									class="bar-chart__fill bar-chart__fill--1"
									style={`--bar-width: ${Math.max(8, Math.round((count / Math.max(...Object.values(data.stats.countsBySignalType), 1)) * 100))}%`}
									id={`dashboard-breakdown-fill-${type}`}
								></div>
							</div>
							<span class="bar-chart__value" id={`dashboard-breakdown-value-${type}`}>{count}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>

		<section class="table-container" id="dashboard-recent-signals">
			<div class="recovery-table__header" id="dashboard-recent-signals-header">
				<h2 class="recovery-table__title" id="dashboard-recent-signals-title">Recent Signals</h2>
				<a class="btn btn-secondary btn-sm" href="/dashboard/recovery" id="dashboard-recent-signals-link">
					Open Recovery Center
				</a>
			</div>
			<div class="table-container--overflow" id="dashboard-recent-signals-scroll">
				<table class="table" id="dashboard-recent-signals-table">
					<thead class="table__head" id="dashboard-recent-signals-head">
						<tr class="table__head-row" id="dashboard-recent-signals-head-row">
							<th class="table__heading" id="dashboard-col-customer">Customer</th>
							<th class="table__heading" id="dashboard-col-signal">Signal</th>
							<th class="table__heading" id="dashboard-col-provider">Provider</th>
							<th class="table__heading table__align-right" id="dashboard-col-mrr">MRR</th>
							<th class="table__heading" id="dashboard-col-detected">Detected</th>
							<th class="table__heading" id="dashboard-col-status">Status</th>
						</tr>
					</thead>
					<tbody class="table__body" id="dashboard-recent-signals-body">
						{#each recentSignals as signal (signal.id)}
							<tr class="table__row" id={`dashboard-signal-row-${signal.id}`}>
								<td class="table__cell" id={`dashboard-signal-customer-${signal.id}`}>
									<div class="table-customer" id={`dashboard-signal-customer-copy-${signal.id}`}>
										<div class="table-customer__name" id={`dashboard-signal-customer-name-${signal.id}`}>{signal.customer_name ?? 'Unknown customer'}</div>
										<div class="table-customer__meta" id={`dashboard-signal-customer-email-${signal.id}`}>{signal.customer_email ?? 'No email on file'}</div>
									</div>
								</td>
								<td class="table__cell" id={`dashboard-signal-type-${signal.id}`}>
									<Badge type={signal.signal_type} size="sm" />
								</td>
								<td class="table__cell" id={`dashboard-signal-provider-${signal.id}`}>
									<span class="plan-badge" id={`dashboard-signal-provider-badge-${signal.id}`}>{signal.provider}</span>
								</td>
								<td class="table__cell table__align-right" id={`dashboard-signal-mrr-${signal.id}`}>
									<span class="font-mono table-mrr" id={`dashboard-signal-mrr-value-${signal.id}`}>{formatCurrency(signal.mrr_amount)}</span>
								</td>
								<td class="table__cell" id={`dashboard-signal-detected-${signal.id}`}>
									<span class="text-secondary" id={`dashboard-signal-detected-value-${signal.id}`}>{formatRelativeTime(signal.detected_at)}</span>
								</td>
								<td class="table__cell" id={`dashboard-signal-status-${signal.id}`}>
									<div class="dashboard-overview__status" id={`dashboard-signal-status-wrap-${signal.id}`}>
										<StatusDot status={signal.status} />
										<span class="dashboard-overview__status-label" id={`dashboard-signal-status-label-${signal.id}`}>{signal.status.replaceAll('_', ' ')}</span>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	</section>
{/if}
