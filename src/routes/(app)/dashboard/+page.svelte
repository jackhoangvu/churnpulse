<script lang="ts">
	import { browser } from '$app/environment';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Reveal from '$lib/components/ui/Reveal.svelte';
	import StatusDot from '$lib/components/ui/StatusDot.svelte';
	import Tooltip from '$lib/components/ui/Tooltip.svelte';
	import { SIGNAL_CONFIGS, type SignalType } from '$lib/types';
	import { colorHash, initialsFromValue } from '$lib/utils/colorHash';
	import { animateCounter } from '$lib/utils/counter';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	type ChartPoint = {
		date: string;
		label: string;
		count: number;
	};

	type ChartGeometry = {
		areaPath: string;
		linePath: string;
		points: Array<{ x: number; y: number; label: string; value: number }>;
		max: number;
	};

	let { data }: Props = $props();

	const currencyFormatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	});

	const integerFormatter = new Intl.NumberFormat('en-US', {
		maximumFractionDigits: 0
	});

	let animatedAtRisk = $state(0);
	let animatedRecovered = $state(0);
	let animatedActive = $state(0);
	let animatedScheduled = $state(0);
	let animatedRecoveryRate = $state(0);

	const sparkline = $derived(data.stats?.sparkline ?? []);
	const recentSignals = $derived(data.stats?.recentSignals ?? []);
	const breakdownRows = $derived.by(() =>
		Object.entries(data.stats?.countsBySignalType ?? {})
			.map(([type, count]) => ({
				type: type as SignalType,
				count,
				config: SIGNAL_CONFIGS[type as SignalType]
			}))
			.sort((left, right) => right.count - left.count)
	);

	function buildChartGeometry(points: ChartPoint[], width: number, height: number): ChartGeometry {
		if (points.length === 0) {
			return {
				areaPath: '',
				linePath: '',
				points: [],
				max: 1
			};
		}

		const max = Math.max(...points.map((point) => point.count), 1);
		const step = width / Math.max(points.length - 1, 1);
		const mappedPoints = points.map((point, index) => {
			const x = step * index;
			const y = height - (point.count / max) * height;
			return {
				x,
				y,
				label: point.label,
				value: point.count
			};
		});

		const linePath = mappedPoints
			.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
			.join(' ');
		const finalX = mappedPoints.at(-1)?.x ?? 0;
		const areaPath = `${linePath} L ${finalX} ${height} L 0 ${height} Z`;

		return {
			areaPath,
			linePath,
			points: mappedPoints,
			max
		};
	}

	function formatCurrency(cents: number): string {
		return currencyFormatter.format(cents / 100);
	}

	function formatInteger(value: number): string {
		return integerFormatter.format(Math.round(value));
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

	function formatDeltaCurrency(delta: number): string {
		const prefix = delta >= 0 ? '+' : '−';
		return `${prefix}${formatCurrency(Math.abs(delta))} from last week · 7-day view`;
	}

	function formatDeltaCount(delta: number): string {
		const prefix = delta >= 0 ? '+' : '−';
		return `${prefix}${formatInteger(Math.abs(delta))} from last week · 7-day view`;
	}

	function resolveTrendClass(delta: number, improvesWhenHigher: boolean): string {
		if (delta === 0) {
			return '';
		}

		const improved = improvesWhenHigher ? delta > 0 : delta < 0;
		return improved ? 'stat-card__trend--up' : 'stat-card__trend--down';
	}

	function resolveTrendIcon(delta: number): 'arrow-right' | 'arrow-up-right' | 'arrow-down-right' {
		if (delta === 0) {
			return 'arrow-right';
		}

		return delta > 0 ? 'arrow-up-right' : 'arrow-down-right';
	}

	function avatarSeed(signal: {
		id: string;
		customer_email: string | null;
		customer_name: string | null;
	}): string {
		return signal.customer_email ?? signal.customer_name ?? signal.id;
	}

	const activityGeometry = $derived.by(() => buildChartGeometry(sparkline, 320, 84));
	const miniSparklineGeometry = $derived.by(() => buildChartGeometry(sparkline, 112, 28));

	const statCards = $derived.by(() => {
		if (!data.stats) {
			return [];
		}

		return [
			{
				label: 'Revenue at Risk',
				value: formatCurrency(Math.round(animatedAtRisk)),
				valueClass: 'stat-card__value stat-card__value--danger',
				trendText: formatDeltaCurrency(data.stats.weekDeltas.atRiskMrr),
				trendClass: resolveTrendClass(data.stats.weekDeltas.atRiskMrr, false),
				trendIcon: resolveTrendIcon(data.stats.weekDeltas.atRiskMrr),
				icon: 'warning' as const,
				tooltip: 'Tracks active revenue tied to detected or running recovery alerts.'
			},
			{
				label: 'Revenue Recovered',
				value: formatCurrency(Math.round(animatedRecovered)),
				valueClass: 'stat-card__value stat-card__value--success',
				trendText: formatDeltaCurrency(data.stats.weekDeltas.recoveredMrr),
				trendClass: resolveTrendClass(data.stats.weekDeltas.recoveredMrr, true),
				trendIcon: resolveTrendIcon(data.stats.weekDeltas.recoveredMrr),
				icon: 'check' as const,
				tooltip: 'Recovered revenue from alerts marked recovered in the last 30 days.'
			},
			{
				label: 'Open Risk Alerts',
				value: formatInteger(animatedActive),
				valueClass: 'stat-card__value',
				trendText: formatDeltaCount(data.stats.weekDeltas.activeSignals),
				trendClass: resolveTrendClass(data.stats.weekDeltas.activeSignals, false),
				trendIcon: resolveTrendIcon(data.stats.weekDeltas.activeSignals),
				icon: 'bell' as const,
				tooltip: 'Open alerts are active signals that still need intervention or scheduled outreach.'
			},
			{
				label: 'Emails Queued Today',
				value: formatInteger(animatedScheduled),
				valueClass: 'stat-card__value stat-card__value--brand',
				trendText: `Recovery rate ${formatInteger(animatedRecoveryRate)}% · 30-day view`,
				trendClass: animatedRecoveryRate >= 50 ? 'stat-card__trend--up' : '',
				trendIcon: 'sparkline' as const,
				icon: 'mail' as const,
				tooltip: 'Emails already scheduled to send in the next 24 hours across all recovery flows.'
			}
		];
	});

	$effect(() => {
		if (!browser || !data.stats) {
			return;
		}

		const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const cleanups = [
			animateCounter({
				from: animatedAtRisk,
				to: data.stats.atRiskMrr,
				reducedMotion,
				onUpdate: (value) => {
					animatedAtRisk = value;
				}
			}),
			animateCounter({
				from: animatedRecovered,
				to: data.stats.recoveredMrr,
				reducedMotion,
				onUpdate: (value) => {
					animatedRecovered = value;
				}
			}),
			animateCounter({
				from: animatedActive,
				to: data.stats.activeSignals,
				reducedMotion,
				onUpdate: (value) => {
					animatedActive = value;
				}
			}),
			animateCounter({
				from: animatedScheduled,
				to: data.stats.scheduledToday,
				reducedMotion,
				onUpdate: (value) => {
					animatedScheduled = value;
				}
			}),
			animateCounter({
				from: animatedRecoveryRate,
				to: data.stats.recoveryRate,
				reducedMotion,
				onUpdate: (value) => {
					animatedRecoveryRate = value;
				}
			})
		];

		return () => {
			for (const cleanup of cleanups) {
				cleanup();
			}
		};
	});
</script>

<svelte:head>
	<title>Dashboard | ChurnPulse</title>
	<meta
		name="description"
		content="Revenue at risk, recovered revenue, and live churn alerts across your connected ChurnPulse account."
	/>
</svelte:head>

{#if !data.connected || !data.stats}
	<section class="page dashboard-overview dashboard-overview--empty">
		<Reveal>
			<div class="card card-brand onboarding-empty-state">
				<div class="onboarding-empty-state__hero">
					<div class="onboarding-empty-state__icon" aria-hidden="true">
						<Icon class="onboarding-empty-state__icon-svg" name="bolt" size={28} />
					</div>
					<p class="page-kicker">Revenue Intelligence</p>
					<h1 class="onboarding-empty-state__title">You&apos;re 60 seconds from your first insight</h1>
					<p class="onboarding-empty-state__copy">
						Connect Stripe, Paddle, Lemon Squeezy, or Polar and ChurnPulse starts scoring
						churn risk across your customer base immediately. No code. Read-only access.
					</p>
				</div>

				<div class="onboarding-empty-state__steps">
					<div class="onboarding-empty-step">
						<span class="onboarding-empty-step__num">1</span>
						<div class="onboarding-empty-step__copy">
							<strong class="onboarding-empty-step__title">Connect your billing platform</strong>
							<p class="onboarding-empty-step__text">
								Authorize read-only access and let events start flowing in.
							</p>
						</div>
					</div>
					<div class="onboarding-empty-step">
						<span class="onboarding-empty-step__num">2</span>
						<div class="onboarding-empty-step__copy">
							<strong class="onboarding-empty-step__title">Watch live risk alerts appear</strong>
							<p class="onboarding-empty-step__text">
								Failed payments, downgrades, cancellations, and silence surface automatically.
							</p>
						</div>
					</div>
					<div class="onboarding-empty-step">
						<span class="onboarding-empty-step__num">3</span>
						<div class="onboarding-empty-step__copy">
							<strong class="onboarding-empty-step__title">Launch recovery without extra tooling</strong>
							<p class="onboarding-empty-step__text">
								Review the queue, step in when needed, or let the sequence run.
							</p>
						</div>
					</div>
				</div>

				<div class="onboarding-empty-state__actions dashboard-overview__empty-actions">
					<a class="btn btn-primary btn-lg" href="/dashboard/settings">
						Connect your billing platform →
					</a>
					<a class="btn btn-secondary btn-sm" href="/demo">Explore with sample data →</a>
				</div>
			</div>
		</Reveal>
	</section>
{:else}
	<section class="page dashboard-overview">
		<Reveal>
			<div class="page__header">
				<div class="page__header-copy">
					<p class="page-kicker">Revenue Intelligence</p>
					<h1 class="page__title">Dashboard</h1>
					<p class="page__subtitle">
						30-day view of churn alerts, recovered revenue, and the next emails scheduled to
						protect at-risk accounts.
					</p>
				</div>
				<span class="page__header-badge">{data.stats.scheduledToday} scheduled today</span>
			</div>
		</Reveal>

		<div class="grid-4">
			{#each statCards as statCard, index}
				<Reveal stagger={index}>
					<article class="stat-card dashboard-overview__stat-card">
						<div class="dashboard-overview__stat-top">
							<p class="stat-card__label">
								<Icon name={statCard.icon} size={13} />
								{statCard.label}
							</p>
							<div class="dashboard-overview__stat-chip">
								<Icon name={statCard.trendIcon} size={13} />
							</div>
						</div>

						<p class={statCard.valueClass}>{statCard.value}</p>

						<svg
							class="dashboard-overview__mini-sparkline"
							viewBox="0 0 112 28"
							aria-hidden="true"
						>
							<defs>
								<linearGradient id={`mini-fill-${index}`} x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stop-color="oklch(55% 0.22 264 / 0.24)" />
									<stop offset="100%" stop-color="oklch(55% 0.22 264 / 0)" />
								</linearGradient>
							</defs>
							<path
								class="dashboard-overview__mini-area"
								d={miniSparklineGeometry.areaPath}
								fill={`url(#mini-fill-${index})`}
							></path>
							<path
								class="dashboard-overview__mini-line"
								d={miniSparklineGeometry.linePath}
							></path>
						</svg>

						<Tooltip content={statCard.tooltip}>
							<p class={`stat-card__trend ${statCard.trendClass}`}>
								<Icon name={statCard.trendIcon} size={12} />
								<span>{statCard.trendText}</span>
							</p>
						</Tooltip>
					</article>
				</Reveal>
			{/each}
		</div>

		<div class="grid-2">
			<Reveal>
				<section class="chart-card dashboard-overview__activity-card">
					<div class="chart-card__header">
						<div class="chart-card__header-copy">
							<h2 class="chart-card__title">Signal Activity</h2>
							<p class="chart-card__subtitle">Last 7 days</p>
						</div>
						<p class="dashboard-overview__chart-meta">
							{data.stats.totalDetected} alerts in the last 30 days
						</p>
					</div>

					<div class="dashboard-overview__sparkline">
						<svg
							class="dashboard-overview__activity-svg"
							viewBox="0 0 320 84"
							aria-hidden="true"
						>
							<defs>
								<linearGradient id="dashboard-activity-fill" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0%" stop-color="oklch(55% 0.22 264 / 0.28)" />
									<stop offset="100%" stop-color="oklch(55% 0.22 264 / 0)" />
								</linearGradient>
							</defs>

							{#each [0.25, 0.5, 0.75, 1] as mark}
								<line
									x1="0"
									x2="320"
									y1={84 - 84 * mark}
									y2={84 - 84 * mark}
									class="dashboard-overview__chart-gridline"
								></line>
							{/each}

							<path
								class="dashboard-overview__activity-area"
								d={activityGeometry.areaPath}
								fill="url(#dashboard-activity-fill)"
							></path>
							<path
								class="dashboard-overview__activity-line"
								d={activityGeometry.linePath}
							></path>
						</svg>
					</div>

					<div class="dashboard-overview__sparkline-labels">
						{#each sparkline as point}
							<span class="dashboard-overview__sparkline-label">{point.label}</span>
						{/each}
					</div>
				</section>
			</Reveal>

			<Reveal delay={60}>
				<section class="chart-card dashboard-overview__breakdown-card">
					<div class="chart-card__header">
						<div class="chart-card__header-copy">
							<h2 class="chart-card__title">Signal Breakdown</h2>
							<p class="chart-card__subtitle">By risk alert type</p>
						</div>
					</div>

					<div class="bar-chart">
						{#each breakdownRows as row, index}
							<div class="bar-chart__row dashboard-overview__breakdown-row">
								<div class="dashboard-overview__breakdown-label">
									<span class="dashboard-overview__breakdown-color" style={`--swatch:${row.config.color}`}></span>
									<span class="bar-chart__label">{row.config.label}</span>
								</div>
								<div class="bar-chart__track dashboard-overview__breakdown-track">
									<div
										class="bar-chart__fill dashboard-overview__breakdown-fill"
										style={`--bar-width:${Math.max(
											8,
											Math.round((row.count / Math.max(...breakdownRows.map((item) => item.count), 1)) * 100)
										)}%;--bar-color:${row.config.color};animation-delay:${index * 40}ms;`}
									></div>
								</div>
								<span class="bar-chart__value">{row.count}</span>
							</div>
						{/each}
					</div>
				</section>
			</Reveal>
		</div>

		<Reveal delay={100}>
			<section class="table-container dashboard-overview__table-card">
				<div class="recovery-table__header">
					<div>
						<h2 class="recovery-table__title">Recent Risk Alerts</h2>
						<p class="dashboard-overview__chart-meta">
							Latest customer alerts that still need review or follow-up.
						</p>
					</div>
					<a class="btn btn-secondary btn-sm" href="/dashboard/recovery">
						Start recovery →
					</a>
				</div>

				<div class="table-container--overflow">
					<table class="table">
						<caption class="sr-only">
							Recent customer churn alerts with provider, value, and current recovery status
						</caption>
						<thead class="table__head">
							<tr class="table__head-row">
								<th class="table__heading">Account</th>
								<th class="table__heading">Alert</th>
								<th class="table__heading">Provider</th>
								<th class="table__heading table__align-right">Monthly value</th>
								<th class="table__heading">Detected</th>
								<th class="table__heading">Status</th>
							</tr>
						</thead>
						<tbody class="table__body">
							{#each recentSignals as signal}
								<tr class="table__row dashboard-overview__table-row">
									<td class="table__cell">
										<div class="dashboard-overview__customer">
											<div
												class="dashboard-overview__avatar"
												style={`--avatar-color:${colorHash(avatarSeed(signal))}`}
												aria-hidden="true"
											>
												{initialsFromValue(signal.customer_name ?? signal.customer_email)}
											</div>
											<div class="table-customer">
												<div class="table-customer__name">
													{signal.customer_name ?? 'Unknown account'}
												</div>
												<div class="table-customer__meta">
													{signal.customer_email ?? 'No email on file'}
												</div>
											</div>
										</div>
									</td>
									<td class="table__cell">
										<Tooltip content={SIGNAL_CONFIGS[signal.signal_type].description}>
											<div class="dashboard-overview__badge-wrap">
												<Badge type={signal.signal_type} size="sm" />
											</div>
										</Tooltip>
									</td>
									<td class="table__cell">
										<span class="plan-badge">{signal.provider}</span>
									</td>
									<td class="table__cell table__align-right">
										<span class="font-mono table-mrr">{formatCurrency(signal.mrr_amount)}</span>
									</td>
									<td class="table__cell">
										<span class="text-secondary">{formatRelativeTime(signal.detected_at)}</span>
									</td>
									<td class="table__cell">
										<div class="dashboard-overview__status-row">
											<div class="dashboard-overview__status">
												<StatusDot status={signal.status} />
												<span class="dashboard-overview__status-label">
													{signal.status.replaceAll('_', ' ')}
												</span>
											</div>
											<a class="dashboard-overview__quick-link" href="/dashboard/recovery">
												Queue
											</a>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		</Reveal>
	</section>
{/if}
