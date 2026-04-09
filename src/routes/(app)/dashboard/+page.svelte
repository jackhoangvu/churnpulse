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
		'high_mrr_risk'
	];
	const signalColors: Record<SignalType, string> = {
		card_failed: '#FF4459',
		disengaged: '#FFB800',
		downgraded: '#FF8C42',
		paused: '#4A9EFF',
		cancelled: 'rgba(255,68,89,0.66)',
		high_mrr_risk: '#FF0033'
	};
	const errorMessages: Record<string, string> = {
		access_denied: 'Stripe connection was cancelled before authorization completed.',
		connect_failed: 'Stripe connection could not be completed. Please try again.',
		create_org_first: 'Create your ChurnPulse workspace before connecting Stripe.',
		missing_code: 'Stripe did not return an authorization code. Please retry the connection.',
		token_exchange_failed: 'Stripe authorization succeeded, but token exchange failed.'
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
				message: 'Stripe connected successfully'
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
		content="Monitor at-risk revenue, recovery progress, and recent churn signals across your Stripe-connected ChurnPulse workspace."
	/>
</svelte:head>

{#if !connected}
	<section class="dashboard-page dashboard-centered">
		<div class="connect-card">
			<div class="connect-icon" aria-hidden="true">
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
			<h2 class="connect-title">Connect your Stripe account</h2>
			<p class="connect-copy">
				Read-only access. 60-second setup. See your at-risk customers immediately.
			</p>

			<ol class="connect-steps">
				<li><span>1</span> Click Connect Stripe</li>
				<li><span>2</span> Authorize Stripe access</li>
				<li><span>3</span> See signals within minutes</li>
			</ol>

			<a class="connect-button" href="/api/stripe/connect">Connect Stripe</a>
			<p class="connect-footnote">
				We never store your Stripe secret key. Access is granted through Stripe OAuth.
			</p>
		</div>
	</section>
{:else if stats}
	<section class="dashboard-page">
		<div class="metric-grid">
			{#each metricCards as metric (metric.label)}
				<article class="metric-card">
					<p class="metric-label">{metric.label}</p>
					<p class={`metric-value ${metric.valueClass}`.trim()}>{metric.value}</p>
					<p class="metric-delta">{metric.delta}</p>
				</article>
			{/each}
		</div>

		<div class="analytics-grid">
			<section class="panel">
				<div class="panel-header">
					<p class="section-label">Signal Breakdown</p>
				</div>

				<div class="breakdown-list">
					{#each breakdownItems as item (item.type)}
						<div class="breakdown-row">
							<p class="breakdown-label">{item.label}</p>
							<div class="breakdown-track">
								<div
									class="breakdown-bar"
									style={`--bar-color: ${item.color}; width: ${(item.count / maxBreakdownCount) * 100}%`}
								></div>
							</div>
							<p class="breakdown-count">{formatCount(item.count)}</p>
						</div>
					{/each}
				</div>
			</section>

			<section class="panel">
				<div class="panel-header">
					<p class="section-label">7-Day Activity</p>
				</div>

				<div class="sparkline-card">
					<svg
						class="sparkline-svg"
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
							<line x1="10" x2="310" y1={y} y2={y} class="sparkline-grid"></line>
						{/each}

						{#if sparklineGeometry.area}
							<polygon points={sparklineGeometry.area} fill="url(#sparkline-fill)"></polygon>
						{/if}

						{#if sparklineGeometry.points}
							<polyline
								points={sparklineGeometry.points}
								class="sparkline-line"
								fill="none"
								stroke-linecap="round"
								stroke-linejoin="round"
							></polyline>
						{/if}
					</svg>

					<div class="sparkline-labels" aria-hidden="true">
						{#each stats.sparkline as point (point.date)}
							<span>{point.label}</span>
						{/each}
					</div>
				</div>
			</section>
		</div>

		<section class="signals-section">
			<div class="signals-header">
				<p class="section-label">Recent Signals</p>
				<a class="signals-link" href="/dashboard/sequences">View all →</a>
			</div>

			{#if recentSignals.length === 0}
				<div class="empty-state">
					<svg class="empty-illustration" viewBox="0 0 120 120" fill="none" aria-hidden="true">
						<rect x="14" y="18" width="92" height="84" stroke="currentColor" opacity="0.18"></rect>
						<path d="M30 72 48 54l12 12 28-28" stroke="currentColor" stroke-width="2"></path>
						<circle cx="48" cy="54" r="4" fill="currentColor"></circle>
						<circle cx="88" cy="38" r="4" fill="currentColor"></circle>
					</svg>
					<p class="empty-title">No signals detected yet.</p>
					<p class="empty-copy">Connect Stripe to start monitoring.</p>
				</div>
			{:else}
				<div class="table-wrap">
					<table class="signals-table">
						<thead>
							<tr>
								<th>Customer</th>
								<th>Signal</th>
								<th class="align-right">MRR</th>
								<th>Detected</th>
								<th>Status</th>
								<th class="align-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each recentSignals as signal (signal.id)}
								<tr>
									<td>
										<div class="customer-cell">
											<p class="customer-name">{signal.customer_name ?? 'Stripe customer'}</p>
											<p class="customer-email">{signal.customer_email ?? 'No email available'}</p>
										</div>
									</td>
									<td>
										<Badge type={signal.signal_type} size="sm" />
									</td>
									<td class="align-right mono-cell">{formatCurrency(signal.mrr_amount)}</td>
									<td>
										<div class="detected-cell">
											<span>{formatRelativeTime(signal.detected_at)}</span>
											<span class="detected-exact">
												{exactDateFormatter.format(new Date(signal.detected_at))}
											</span>
										</div>
									</td>
									<td>
										<div class="status-cell">
											<StatusDot status={signal.status} />
											<span>{signal.status.replaceAll('_', ' ')}</span>
										</div>
									</td>
									<td class="align-right">
										<div class="action-cell">
											<form method="POST" action="?/dismiss">
												<input type="hidden" name="signalId" value={signal.id} />
												<button class="table-button table-button-muted" type="submit">
													Dismiss
												</button>
											</form>
											<a
												class="table-button table-button-cyan"
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
			<section class="quick-actions">
				<p class="quick-copy">⚡ {formatCount(stats.scheduledToday)} sequence emails scheduled for today</p>
				<a class="quick-link" href="/dashboard/sequences">View sequences →</a>
			</section>
		{/if}
	</section>
{/if}

{#if toast}
	<div class={`toast toast-${toast.kind}`}>
		<p>{toast.message}</p>
	</div>
{/if}

<style>
	.dashboard-page {
		display: flex;
		min-height: calc(100vh - 48px);
		flex-direction: column;
		gap: 1.5rem;
		padding: 1.5rem;
	}

	.dashboard-centered {
		justify-content: center;
	}

	.connect-card,
	.metric-card,
	.panel,
	.signals-section {
		border: 1px solid rgba(255, 255, 255, 0.07);
		background: var(--bg-surface);
	}

	.connect-card {
		width: min(100%, 30rem);
		margin: 0 auto;
		padding: 2rem;
	}

	.connect-icon {
		display: inline-flex;
		width: 3.25rem;
		height: 3.25rem;
		color: var(--accent-cyan);
	}

	.connect-icon :global(svg) {
		width: 100%;
		height: 100%;
	}

	.connect-title,
	.empty-title {
		margin: 1.5rem 0 0;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1.5rem;
		font-weight: 500;
		line-height: 1.25;
		letter-spacing: 0.02em;
		text-transform: none;
		color: var(--text-primary);
	}

	.connect-copy,
	.connect-footnote,
	.empty-copy {
		margin: 0.9rem 0 0;
		font-size: 0.95rem;
		line-height: 1.7;
		color: var(--text-secondary);
	}

	.connect-steps {
		display: grid;
		gap: 0.9rem;
		margin: 1.5rem 0 0;
		padding: 0;
		list-style: none;
	}

	.connect-steps li {
		display: flex;
		align-items: center;
		gap: 0.85rem;
		font-size: 0.95rem;
		color: var(--text-primary);
	}

	.connect-steps span {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.6rem;
		height: 1.6rem;
		border: 1px solid var(--border-accent);
		background: rgba(0, 229, 255, 0.08);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.7rem;
		color: var(--accent-cyan);
	}

	.connect-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		margin-top: 1.75rem;
		padding: 0.95rem 1rem;
		background: var(--accent-cyan);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #000;
	}

	.metric-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(4, minmax(0, 1fr));
	}

	.metric-card {
		padding: 1.25rem;
	}

	.metric-label,
	.section-label,
	.signals-table th {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.69rem;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.metric-value {
		margin: 0.85rem 0 0;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1.75rem;
		font-weight: 500;
		letter-spacing: -0.02em;
		color: var(--text-primary);
	}

	.metric-value-success {
		color: var(--status-success);
	}

	.metric-value-warning {
		color: var(--status-warning);
	}

	.metric-value-danger {
		color: var(--status-danger);
	}

	.metric-delta {
		margin: 0.55rem 0 0;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.analytics-grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(0, 3fr) minmax(20rem, 2fr);
	}

	.panel {
		padding: 1.25rem;
	}

	.panel-header,
	.signals-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.breakdown-list {
		display: grid;
		gap: 1rem;
		margin-top: 1rem;
	}

	.breakdown-row {
		display: grid;
		align-items: center;
		gap: 0.85rem;
		grid-template-columns: 8rem minmax(0, 1fr) auto;
	}

	.breakdown-label,
	.breakdown-count,
	.sparkline-labels span,
	.mono-cell,
	.quick-copy {
		font-family: 'IBM Plex Mono', monospace;
	}

	.breakdown-label {
		font-size: 0.82rem;
		color: var(--text-secondary);
	}

	.breakdown-track {
		height: 0.375rem;
		background: rgba(255, 255, 255, 0.06);
	}

	.breakdown-bar {
		height: 100%;
		background: var(--bar-color);
	}

	.breakdown-count {
		font-size: 0.8rem;
		color: var(--text-primary);
	}

	.sparkline-card {
		margin-top: 1rem;
	}

	.sparkline-svg {
		display: block;
		width: 100%;
		height: 5rem;
	}

	.sparkline-grid {
		stroke: rgba(255, 255, 255, 0.06);
		stroke-width: 1;
	}

	.sparkline-line {
		stroke: var(--accent-cyan);
		stroke-width: 1.5;
	}

	.sparkline-labels {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		margin-top: 0.45rem;
	}

	.sparkline-labels span {
		font-size: 0.625rem;
		text-align: center;
		color: var(--text-muted);
	}

	.signals-section {
		padding: 1.25rem 0 0;
	}

	.signals-header {
		padding: 0 1.25rem 1rem;
	}

	.signals-link,
	.quick-link {
		font-size: 0.85rem;
		color: var(--accent-cyan);
	}

	.table-wrap {
		overflow-x: auto;
	}

	.signals-table {
		width: 100%;
		border-collapse: collapse;
	}

	.signals-table th {
		padding: 0 1.25rem 0.9rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		text-align: left;
	}

	.signals-table td {
		padding: 1rem 1.25rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		vertical-align: middle;
	}

	.signals-table tbody tr {
		transition: background-color 140ms ease;
	}

	.signals-table tbody tr:hover {
		background: rgba(255, 255, 255, 0.02);
	}

	.align-right {
		text-align: right;
	}

	.customer-name {
		margin: 0;
		font-size: 0.88rem;
		color: var(--text-primary);
	}

	.customer-email,
	.detected-exact {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.detected-cell {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		font-size: 0.85rem;
		color: var(--text-primary);
	}

	.status-cell,
	.action-cell {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
	}

	.status-cell {
		font-size: 0.82rem;
		text-transform: capitalize;
		color: var(--text-primary);
	}

	.action-cell {
		justify-content: flex-end;
	}

	.table-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.46rem 0.7rem;
		border: 1px solid transparent;
		background: transparent;
		font-size: 0.75rem;
		transition:
			border-color 140ms ease,
			background-color 140ms ease,
			color 140ms ease;
	}

	.table-button-muted {
		border-color: rgba(255, 255, 255, 0.08);
		color: var(--text-secondary);
	}

	.table-button-muted:hover {
		border-color: rgba(255, 255, 255, 0.14);
		background: rgba(255, 255, 255, 0.03);
		color: var(--text-primary);
	}

	.table-button-cyan {
		border-color: rgba(0, 229, 255, 0.18);
		color: var(--accent-cyan);
	}

	.table-button-cyan:hover {
		background: rgba(0, 229, 255, 0.08);
	}

	.empty-state {
		display: grid;
		place-items: center;
		padding: 3rem 1.5rem 3.5rem;
		text-align: center;
	}

	.empty-illustration {
		width: 7rem;
		height: 7rem;
		color: rgba(0, 229, 255, 0.65);
	}

	.quick-actions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1.25rem;
		border: 1px solid rgba(0, 229, 255, 0.15);
		background: rgba(0, 229, 255, 0.05);
	}

	.quick-copy {
		margin: 0;
		font-size: 0.78rem;
		letter-spacing: 0.03em;
		color: var(--text-primary);
	}

	.toast {
		position: fixed;
		right: 1.5rem;
		bottom: 1.5rem;
		min-width: 18rem;
		max-width: 24rem;
		padding: 0.9rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(17, 17, 19, 0.96);
		animation: toast-slide-up 220ms ease-out;
		backdrop-filter: blur(10px);
	}

	.toast p {
		margin: 0;
		font-size: 0.86rem;
		color: var(--text-primary);
	}

	.toast-success {
		border-left: 3px solid var(--status-success);
	}

	.toast-error {
		border-left: 3px solid var(--status-danger);
	}

	@keyframes toast-slide-up {
		from {
			opacity: 0;
			transform: translateY(12px);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (max-width: 1024px) {
		.metric-grid,
		.analytics-grid {
			grid-template-columns: 1fr 1fr;
		}
	}

	@media (max-width: 768px) {
		.dashboard-page {
			padding: 1rem;
		}

		.metric-grid,
		.analytics-grid {
			grid-template-columns: 1fr;
		}

		.breakdown-row {
			grid-template-columns: 1fr;
		}

		.breakdown-track {
			order: 2;
		}

		.breakdown-count {
			order: 3;
		}

		.quick-actions {
			flex-direction: column;
			align-items: flex-start;
		}

		.toast {
			right: 1rem;
			left: 1rem;
			bottom: 1rem;
			min-width: 0;
		}
	}
</style>
