<script lang="ts">
	import { page } from '$app/state';
	import Badge from '$lib/components/ui/Badge.svelte';
	import StatusDot from '$lib/components/ui/StatusDot.svelte';
	import { SIGNAL_CONFIGS, type SignalType } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	type ToastState = {
		key: string;
		kind: 'success' | 'error';
		message: string;
	};

	type BreakdownItem = {
		type: SignalType;
		label: string;
		color: string;
		count: number;
	};

	type MetricCard = {
		label: string;
		value: string;
		valueClass: string;
		delta: string;
	};

	type SparklineGeometry = {
		points: string;
		area: string;
		gridLines: number[];
	};

	interface Props {
		data: PageData;
		form?: ActionData;
	}

	const currencyFormatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	});
	const percentFormatter = new Intl.NumberFormat('en-US', {
		maximumFractionDigits: 0
	});
	const exactDateFormatter = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});
	const signalOrder: SignalType[] = [
		'card_failed',
		'disengaged',
		'downgraded',
		'paused',
		'cancelled',
		'high_mrr_risk',
		'trial_ending'
	];
	const signalColors: Record<SignalType, string> = {
		card_failed: '#FF4459',
		disengaged: '#FFB800',
		downgraded: '#FF8C42',
		paused: '#4A9EFF',
		cancelled: 'rgba(255,68,89,0.66)',
		high_mrr_risk: '#FF0033',
		trial_ending: '#A78BFA'
	};
	const errorMessages: Record<string, string> = {
		access_denied: 'Polar connection was cancelled before authorization completed.',
		connect_failed: 'Polar connection could not be completed. Please try again.',
		create_org_first: 'Create your ChurnPulse workspace before connecting Polar.',
		missing_code: 'Polar did not return an authorization code. Please retry the connection.',
		token_exchange_failed: 'Polar authorization succeeded, but token exchange failed.'
	};

	let { data, form }: Props = $props();
	let toast = $state<ToastState | null>(null);
	let lastToastKey = $state('');

	const nowIso = $derived(data.nowIso);
	const stats = $derived(data.stats);
	const connected = $derived(data.connected);
	const recentSignals = $derived(stats?.recentSignals ?? []);

	const breakdownItems = $derived.by<BreakdownItem[]>(() => {
		if (!stats) {
			return [];
		}

		return signalOrder.map((type) => ({
			type,
			label: SIGNAL_CONFIGS[type].label,
			color: signalColors[type],
			count: stats.countsBySignalType[type]
		}));
	});

	const maxBreakdownCount = $derived.by(() => {
		return Math.max(
			1,
			...breakdownItems.map((item) => item.count)
		);
	});

	const sparklineGeometry = $derived.by<SparklineGeometry>(() => {
		if (!stats || stats.sparkline.length === 0) {
			return {
				points: '',
				area: '',
				gridLines: [20, 40, 60]
			};
		}

		const width = 320;
		const height = 80;
		const paddingX = 10;
		const paddingY = 8;
		const innerWidth = width - paddingX * 2;
		const innerHeight = height - paddingY * 2;
		const maxValue = Math.max(1, ...stats.sparkline.map((point) => point.count));
		const stepX = stats.sparkline.length > 1 ? innerWidth / (stats.sparkline.length - 1) : 0;
		const coordinates = stats.sparkline.map((point, index) => {
			const x = paddingX + stepX * index;
			const ratio = point.count / maxValue;
			const y = height - paddingY - ratio * innerHeight;
			return { x, y };
		});
		const points = coordinates.map((coordinate) => `${coordinate.x},${coordinate.y}`).join(' ');
		const baseline = height - paddingY;
		const first = coordinates[0];
		const last = coordinates[coordinates.length - 1];
		const area = first
			? `${first.x},${baseline} ${points} ${last.x},${baseline}`
			: '';
		const gridLines = [0.25, 0.5, 0.75].map((ratio) => height - paddingY - ratio * innerHeight);

		return { points, area, gridLines };
	});

	const metricCards = $derived.by<MetricCard[]>(() => {
		if (!stats) {
			return [];
		}

		return [
			{
				label: 'At Risk MRR',
				value: formatCurrency(stats.atRiskMrr),
				valueClass: stats.atRiskMrr > 50_000 ? 'metric-value-danger' : '',
				delta: formatSignedCurrency(stats.weekDeltas.atRiskMrr, 'vs previous week')
			},
			{
				label: 'Recovered MRR',
				value: formatCurrency(stats.recoveredMrr),
				valueClass: 'metric-value-success',
				delta: formatSignedCurrency(stats.weekDeltas.recoveredMrr, 'vs previous week')
			},
			{
				label: 'Active Signals',
				value: formatCount(stats.activeSignals),
				valueClass: '',
				delta: formatSignedCount(stats.weekDeltas.activeSignals, 'vs previous week')
			},
			{
				label: 'Recovery Rate',
				value: `${percentFormatter.format(stats.recoveryRate)}%`,
				valueClass: recoveryRateClass(stats.recoveryRate),
				delta: formatSignedPercentage(stats.weekDeltas.recoveryRate, 'pts vs previous week')
			}
		];
	});

	const queryToast = $derived.by<ToastState | null>(() => {
		if (form && 'message' in form && typeof form.message === 'string' && form.message.trim()) {
			return {
				key: `form:${form.message}`,
				kind: 'success',
				message: form.message
			};
		}

		const connectedParam = page.url.searchParams.get('connected');
		const errorParam = page.url.searchParams.get('error');

		if (connectedParam === 'true') {
			return {
				key: 'success:connected',
				kind: 'success',
				message: 'Polar connected successfully'
			};
		}

		if (errorParam) {
			return {
				key: `error:${errorParam}`,
				kind: 'error',
				message: errorMessages[errorParam] ?? 'Something went wrong while loading the dashboard.'
			};
		}

		return null;
	});

	$effect(() => {
		const nextToast = queryToast;

		if (!nextToast || nextToast.key === lastToastKey) {
			return;
		}

		lastToastKey = nextToast.key;
		toast = nextToast;

		const timeout = window.setTimeout(() => {
			if (toast?.key === nextToast.key) {
				toast = null;
			}
		}, 3000);

		return () => window.clearTimeout(timeout);
	});

	function formatCurrency(amountCents: number): string {
		return currencyFormatter.format(amountCents / 100);
	}

	function formatCount(value: number): string {
		return new Intl.NumberFormat('en-US').format(value);
	}

	function formatSignedCurrency(diffCents: number, suffix: string): string {
		if (diffCents === 0) {
			return `No change ${suffix}`;
		}

		const sign = diffCents > 0 ? '+' : '-';
		return `${sign}${formatCurrency(Math.abs(diffCents))} ${suffix}`;
	}

	function formatSignedCount(diff: number, suffix: string): string {
		if (diff === 0) {
			return `No change ${suffix}`;
		}

		const sign = diff > 0 ? '+' : '-';
		return `${sign}${formatCount(Math.abs(diff))} ${suffix}`;
	}

	function formatSignedPercentage(diff: number, suffix: string): string {
		if (diff === 0) {
			return `No change ${suffix}`;
		}

		const sign = diff > 0 ? '+' : '-';
		return `${sign}${percentFormatter.format(Math.abs(diff))} ${suffix}`;
	}

	function recoveryRateClass(rate: number): string {
		if (rate > 50) {
			return 'metric-value-success';
		}

		if (rate >= 30) {
			return 'metric-value-warning';
		}

		return 'metric-value-danger';
	}

	function formatRelativeTime(dateIso: string): string {
		const date = new Date(dateIso);
		const diffMs = new Date(nowIso).getTime() - date.getTime();
		const minute = 60 * 1000;
		const hour = 60 * minute;
		const day = 24 * hour;

		if (diffMs < minute) {
			return 'Just now';
		}

		if (diffMs < hour) {
			return `${Math.floor(diffMs / minute)}m ago`;
		}

		if (diffMs < day) {
			return `${Math.floor(diffMs / hour)}h ago`;
		}

		if (diffMs < 30 * day) {
			return `${Math.floor(diffMs / day)}d ago`;
		}

		return exactDateFormatter.format(date);
	}
</script>

<svelte:head>
	<title>Dashboard | ChurnPulse</title>
	<meta
		name="description"
		content="Monitor at-risk revenue, recovery progress, and recent churn signals across your Polar-connected ChurnPulse workspace."
	/>
</svelte:head>

{#if !connected}
	<section class="dashboard-page dashboard-centered">
		<div class="dashboard-page__connect-card card card-brand">
			<div class="dashboard-page__connect-icon" aria-hidden="true">
				<svg viewBox="0 0 64 64" fill="none">
					<path
						d="M10 20h24c8 0 12 4 12 12s-4 12-12 12H10V20Zm22 18c4.7 0 7-2 7-6s-2.3-6-7-6H17v12h15Z"
						fill="currentColor"
					/>
					<path
						d="M38 20h16v6H38v18h16v6H31V20h7Z"
						fill="currentColor"
						opacity="0.72"
					/>
				</svg>
			</div>
			<h2 class="dashboard-page__connect-title">Connect your Polar account</h2>
			<p class="dashboard-page__connect-copy">
				Read-only access. 60-second setup. See your at-risk customers immediately.
			</p>

			<ol class="dashboard-page__connect-steps">
				<li class="dashboard-page__connect-step">
					<span class="dashboard-page__connect-step-index">1</span>
					<span>Click Connect Polar</span>
				</li>
				<li class="dashboard-page__connect-step">
					<span class="dashboard-page__connect-step-index">2</span>
					<span>Authorize Polar access</span>
				</li>
				<li class="dashboard-page__connect-step">
					<span class="dashboard-page__connect-step-index">3</span>
					<span>See signals within minutes</span>
				</li>
			</ol>

			<a class="btn btn-primary btn-full dashboard-page__connect-button" href="/api/polar/connect">
				Connect Polar
			</a>
			<p class="dashboard-page__connect-footnote">
				We never store your Polar secret key. Access is granted through Polar OAuth.
			</p>
		</div>
	</section>
{:else if stats}
	<section class="dashboard-page">
		<div class="dashboard-page__metrics">
			{#each metricCards as metric (metric.label)}
				<article class="dashboard-page__metric-card card">
					<p class="dashboard-page__metric-label">{metric.label}</p>
					<p
						class={`dashboard-page__metric-value ${
							metric.valueClass === 'metric-value-success'
								? 'dashboard-page__metric-value--success'
								: metric.valueClass === 'metric-value-warning'
									? 'dashboard-page__metric-value--warning'
									: metric.valueClass === 'metric-value-danger'
										? 'dashboard-page__metric-value--danger'
										: ''
						}`.trim()}
					>
						{metric.value}
					</p>
					<p class="dashboard-page__metric-delta">{metric.delta}</p>
				</article>
			{/each}
		</div>

		<div class="dashboard-page__analytics">
			<section class="dashboard-page__panel card">
				<div class="dashboard-page__panel-header">
					<p class="section-label">Signal Breakdown</p>
				</div>

				<div class="dashboard-page__breakdown-list">
					{#each breakdownItems as item (item.type)}
						<div class="dashboard-page__breakdown-row">
							<p class="dashboard-page__breakdown-label">{item.label}</p>
							<div class="dashboard-page__breakdown-track">
								<svg
									class="dashboard-page__breakdown-track"
									viewBox="0 0 100 6"
									preserveAspectRatio="none"
									aria-hidden="true"
								>
									<rect x="0" y="0" width="100" height="6" rx="3" fill="rgba(255,255,255,0.06)"></rect>
									<rect
										x="0"
										y="0"
										width={(item.count / maxBreakdownCount) * 100}
										height="6"
										rx="3"
										fill={item.color}
									></rect>
								</svg>
							</div>
							<p class="dashboard-page__breakdown-count">{formatCount(item.count)}</p>
						</div>
					{/each}
				</div>
			</section>

			<section class="dashboard-page__panel card">
				<div class="dashboard-page__panel-header">
					<p class="section-label">7-Day Activity</p>
				</div>

				<div class="dashboard-page__sparkline">
					<svg
						class="dashboard-page__sparkline-svg"
						viewBox="0 0 320 80"
						role="img"
						aria-label="Seven day churn signal activity"
					>
						<defs>
							<linearGradient id="sparkline-fill" x1="0" x2="0" y1="0" y2="1">
								<stop offset="0%" stop-color="rgba(0,229,255,0.15)"></stop>
								<stop offset="100%" stop-color="rgba(0,229,255,0)"></stop>
							</linearGradient>
						</defs>

						{#each sparklineGeometry.gridLines as y}
							<line
								x1="10"
								x2="310"
								y1={y}
								y2={y}
								class="dashboard-page__sparkline-grid"
							></line>
						{/each}

						{#if sparklineGeometry.area}
							<polygon points={sparklineGeometry.area} fill="url(#sparkline-fill)"></polygon>
						{/if}

						{#if sparklineGeometry.points}
							<polyline
								points={sparklineGeometry.points}
								class="dashboard-page__sparkline-line"
								fill="none"
								stroke-linecap="round"
								stroke-linejoin="round"
							></polyline>
						{/if}
					</svg>

					<div class="dashboard-page__sparkline-labels" aria-hidden="true">
						{#each stats.sparkline as point (point.date)}
							<span class="dashboard-page__sparkline-label">{point.label}</span>
						{/each}
					</div>
				</div>
			</section>
		</div>

		<section class="dashboard-page__signals">
			<div class="dashboard-page__signals-header">
				<p class="section-label">Recent Signals</p>
				<a class="dashboard-page__link" href="/dashboard/sequences">View all →</a>
			</div>

			{#if recentSignals.length === 0}
				<div class="dashboard-page__empty">
					<svg
						class="dashboard-page__empty-illustration"
						viewBox="0 0 120 120"
						fill="none"
						aria-hidden="true"
					>
						<rect x="14" y="18" width="92" height="84" stroke="currentColor" opacity="0.18"></rect>
						<path d="M30 72 48 54l12 12 28-28" stroke="currentColor" stroke-width="2"></path>
						<circle cx="48" cy="54" r="4" fill="currentColor"></circle>
						<circle cx="88" cy="38" r="4" fill="currentColor"></circle>
					</svg>
					<p class="dashboard-page__empty-title">No signals detected yet.</p>
					<p class="dashboard-page__empty-copy">Connect Polar to start monitoring.</p>
				</div>
			{:else}
				<div class="dashboard-page__table-wrap">
					<table class="dashboard-page__table">
						<thead>
							<tr>
								<th>Customer</th>
								<th>Signal</th>
								<th class="dashboard-page__align-right">MRR</th>
								<th>Detected</th>
								<th>Status</th>
								<th class="dashboard-page__align-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each recentSignals as signal (signal.id)}
								<tr>
									<td>
										<div class="dashboard-page__customer">
											<p class="dashboard-page__customer-name">
												{signal.customer_name ?? 'Polar customer'}
											</p>
											<p class="dashboard-page__customer-email">
												{signal.customer_email ?? 'No email available'}
											</p>
										</div>
									</td>
									<td>
										<Badge type={signal.signal_type} size="sm" />
									</td>
									<td class="dashboard-page__align-right dashboard-page__mono">
										{formatCurrency(signal.mrr_amount)}
									</td>
									<td>
										<div class="dashboard-page__detected">
											<span>{formatRelativeTime(signal.detected_at)}</span>
											<span class="dashboard-page__detected-exact">
												{exactDateFormatter.format(new Date(signal.detected_at))}
											</span>
										</div>
									</td>
									<td>
										<div class="dashboard-page__status">
											<StatusDot status={signal.status} />
											<span>{signal.status.replaceAll('_', ' ')}</span>
										</div>
									</td>
									<td class="dashboard-page__align-right">
										<div class="dashboard-page__actions">
											<form method="POST" action="?/dismiss">
												<input type="hidden" name="signalId" value={signal.id} />
												<button class="btn btn-secondary btn-sm dashboard-page__table-button" type="submit">
													Dismiss
												</button>
											</form>
											<a
												class="btn btn-ghost btn-sm dashboard-page__table-button"
												href={`/dashboard/sequences?signal_type=${signal.signal_type}`}
											>
												View
											</a>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>

		{#if stats.totalDetected > 0}
			<section class="dashboard-page__quick">
				<p class="dashboard-page__quick-copy">
					⚡ {formatCount(stats.scheduledToday)} sequence emails scheduled for today
				</p>
				<a class="dashboard-page__quick-link" href="/dashboard/sequences">View sequences →</a>
			</section>
		{/if}
	</section>
{/if}

{#if toast}
	<div class="dashboard-toast-stack">
		<div class={`dashboard-toast dashboard-toast--${toast.kind}`}>
			<div class="dashboard-toast__accent"></div>
			<p class="dashboard-toast__message">{toast.message}</p>
		</div>
	</div>
{/if}
