<script lang="ts">
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	type QualityLevel = 'strong' | 'good' | 'excellent' | 'normal' | 'warning';

	let { data }: Props = $props();

	const currencyFormatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	});

	function formatCurrency(cents: number): string {
		return currencyFormatter.format(cents / 100);
	}

	function qualityClass(label: string): QualityLevel {
		const normalized = label.toLowerCase();

		if (normalized === 'strong') {
			return 'strong';
		}

		if (normalized === 'good') {
			return 'good';
		}

		if (normalized === 'excellent') {
			return 'excellent';
		}

		if (normalized === 'normal') {
			return 'normal';
		}

		return 'warning';
	}

	function riskClass(score: number): 'low' | 'medium' | 'high' {
		if (score > 50) {
			return 'high';
		}

		if (score > 35) {
			return 'medium';
		}

		return 'low';
	}

	function sparklinePoints(values: number[]): string {
		if (values.length === 0) {
			return '';
		}

		const width = 72;
		const height = 24;
		const max = Math.max(...values);
		const min = Math.min(...values);
		const range = max - min || 1;

		return values
			.map((value, index) => {
				const x = (index / Math.max(1, values.length - 1)) * width;
				const y = height - ((value - min) / range) * height;
				return `${x},${y}`;
			})
			.join(' ');
	}
</script>

<svelte:head>
	<title>Analytics | ChurnPulse</title>
	<meta
		name="description"
		content="Churn prediction accuracy, revenue at risk, cohort analysis, and recovery funnel metrics."
	/>
</svelte:head>

<section class="page analytics-page" id="analytics-page">
	<div class="page__header" id="analytics-header">
		<div class="page__header-copy" id="analytics-header-copy">
			<h1 class="page__title" id="analytics-title">Analytics</h1>
			<p class="page__subtitle" id="analytics-subtitle">90-day performance overview</p>
		</div>
	</div>

	<div class="grid-4" id="analytics-stats">
		<div class="stat-card" id="analytics-stat-at-risk">
			<p class="stat-card__label" id="analytics-stat-at-risk-label">
				At-Risk Accounts
				<svg class="stat-card__icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
					<path class="stat-card__icon-path" d="m3 3 4 4M21 3l-4 4" />
					<path class="stat-card__icon-path" d="M12 8v4M8 21l4-5 4 5M12 2v2" />
				</svg>
			</p>
			<p class="stat-card__value" id="analytics-stat-at-risk-value">{data.atRiskAccounts}</p>
			<p class="stat-card__trend" id="analytics-stat-at-risk-trend">Flagged by the system</p>
		</div>
		<div class="stat-card" id="analytics-stat-revenue">
			<p class="stat-card__label" id="analytics-stat-revenue-label">
				Revenue at Risk
				<svg class="stat-card__icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
					<path class="stat-card__icon-path" d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
				</svg>
			</p>
			<p class="stat-card__value stat-card__value--danger" id="analytics-stat-revenue-value">
				{formatCurrency(data.revenueAtRisk)}
			</p>
			<p class="stat-card__trend" id="analytics-stat-revenue-trend">Monthly subscription revenue</p>
		</div>
		<div class="stat-card" id="analytics-stat-recoverable">
			<p class="stat-card__label" id="analytics-stat-recoverable-label">
				Estimated Recoverable
				<svg class="stat-card__icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
					<polyline class="stat-card__icon-polyline" points="23 6 13.5 15.5 8.5 10.5 1 18" />
					<polyline class="stat-card__icon-polyline" points="17 6 23 6 23 12" />
				</svg>
			</p>
			<p class="stat-card__value stat-card__value--success" id="analytics-stat-recoverable-value">
				{formatCurrency(data.estimatedRecoverable)}
			</p>
			<p class="stat-card__trend stat-card__trend--up" id="analytics-stat-recoverable-trend">
				60% of at-risk revenue
			</p>
		</div>
		<div class="stat-card" id="analytics-stat-risk-score">
			<p class="stat-card__label" id="analytics-stat-risk-score-label">
				Average Risk Score
				<svg class="stat-card__icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
					<circle class="stat-card__icon-circle" cx="12" cy="12" r="10" />
					<path class="stat-card__icon-path" d="M12 8v4M12 16h.01" />
				</svg>
			</p>
			<p class="stat-card__value" id="analytics-stat-risk-score-value">{data.avgRiskScore}</p>
			<p class="stat-card__trend" id="analytics-stat-risk-score-trend">Across flagged accounts</p>
		</div>
	</div>

	<div class="chart-card" id="analytics-quality-card">
		<div class="chart-card__header" id="analytics-quality-header">
			<div class="chart-card__header-copy" id="analytics-quality-copy">
				<h3 class="chart-card__title" id="analytics-quality-title">
					<svg class="chart-card__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
						<circle class="chart-card__icon-circle" cx="12" cy="12" r="10" />
						<path class="chart-card__icon-path" d="M12 8v4M12 16h.01" />
					</svg>
					How Well We Spot Risk
				</h3>
			</div>
		</div>
		<div class="grid-4" id="analytics-quality-grid">
			{#each [
				{ key: 'spotting', label: 'Spotting Risk', metric: data.spotting },
				{ key: 'flag-accuracy', label: 'Flag Accuracy', metric: data.flagAccuracy },
				{ key: 'early-warning', label: 'Early Warning Strength', metric: data.earlyWarning },
				{ key: 'trustworthy', label: 'Trustworthiness', metric: data.trustworthy }
			] as item (item.key)}
				<div class="perf-metric card" id={`analytics-quality-${item.key}`}>
					<div class="perf-metric__header" id={`analytics-quality-header-${item.key}`}>
						<span class="perf-metric__name" id={`analytics-quality-name-${item.key}`}>{item.label}</span>
						<svg class="perf-metric__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
							<polyline class="perf-metric__icon-polyline" points="23 6 13.5 15.5 8.5 10.5 1 18" />
						</svg>
					</div>
					<div class={`quality-label quality-label--${qualityClass(item.metric.label)} perf-metric__label`} id={`analytics-quality-label-${item.key}`}>
						{item.metric.label}
					</div>
					<p class="perf-metric__stat" id={`analytics-quality-stat-${item.key}`}>{item.metric.stat}</p>
				</div>
			{/each}
		</div>
	</div>

	<div class="grid-2" id="analytics-distribution-row">
		<div class="chart-card" id="analytics-spread-card">
			<div class="chart-card__header" id="analytics-spread-header">
				<h3 class="chart-card__title" id="analytics-spread-title">How Risk is Spread Across Accounts</h3>
			</div>
			<div class="bar-chart" id="analytics-spread-chart" role="img" aria-label="Risk distribution across MRR bands">
				{#each data.mrrBuckets as bucket (bucket.label)}
					<div class="bar-chart__row analytics-bar-chart__row" id={`analytics-spread-row-${bucket.label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}>
						<span class="bar-chart__label" id={`analytics-spread-label-${bucket.label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}>{bucket.label}</span>
						<div class="bar-chart__track" id={`analytics-spread-track-${bucket.label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}>
							<div
								class="bar-chart__fill bar-chart__fill--2"
								style={`--bar-width: ${Math.round((bucket.count / data.maxBucket) * 100)}%`}
								role="progressbar"
								aria-valuenow={bucket.count}
								aria-valuemin="0"
								aria-valuemax={data.maxBucket}
								id={`analytics-spread-fill-${bucket.label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
							></div>
						</div>
						<span class="bar-chart__value" id={`analytics-spread-count-${bucket.label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}>{bucket.count}</span>
					</div>
				{/each}
			</div>
		</div>

		<div class="chart-card" id="analytics-reasons-card">
			<div class="chart-card__header" id="analytics-reasons-header">
				<h3 class="chart-card__title" id="analytics-reasons-title">Why Customers Leave</h3>
			</div>
			<div class="bar-chart" id="analytics-reasons-chart" role="img" aria-label="Churn reason breakdown">
				{#each data.reasonBreakdown as reason (reason.label)}
					<div class="bar-chart__row analytics-bar-chart__row--reasons" id={`analytics-reason-row-${reason.label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}>
						<span class="bar-chart__label" id={`analytics-reason-label-${reason.label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}>{reason.label}</span>
						<div class="bar-chart__track" id={`analytics-reason-track-${reason.label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}>
							<div
								class={`bar-chart__fill ${reason.fillClass}`}
								style={`--bar-width: ${Math.round((reason.count / data.maxReason) * 100)}%`}
								role="progressbar"
								aria-valuenow={reason.count}
								aria-valuemin="0"
								aria-valuemax={data.maxReason}
								id={`analytics-reason-fill-${reason.label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
							></div>
						</div>
						<span class="bar-chart__value" id={`analytics-reason-count-${reason.label.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}>{reason.count}</span>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="chart-card" id="analytics-area-card">
		<div class="chart-card__header" id="analytics-area-header">
			<h3 class="chart-card__title" id="analytics-area-title">Risk Breakdown by Area</h3>
		</div>
		<div class="bar-chart" id="analytics-area-chart" role="img" aria-label="Risk breakdown by business area">
			{#each data.areaBreakdown as area (area.label)}
				<div class="bar-chart__row analytics-bar-chart__row--area" id={`analytics-area-row-${area.label.toLowerCase()}`}>
					<span class="bar-chart__label" id={`analytics-area-label-${area.label.toLowerCase()}`}>{area.label}</span>
					<div class="bar-chart__track" id={`analytics-area-track-${area.label.toLowerCase()}`}>
						<div
							class={`bar-chart__fill ${area.fillClass}`}
							style={`--bar-width: ${Math.round((area.total / data.maxArea) * 100)}%`}
							role="progressbar"
							aria-valuenow={area.total}
							aria-valuemin="0"
							aria-valuemax={data.maxArea}
							id={`analytics-area-fill-${area.label.toLowerCase()}`}
						></div>
					</div>
					<span class="analytics-area__detail" id={`analytics-area-detail-${area.label.toLowerCase()}`}>
						{area.high > 0 ? `${area.high} high` : ''}
					</span>
					<span class="bar-chart__value" id={`analytics-area-count-${area.label.toLowerCase()}`}>{area.total}</span>
				</div>
			{/each}
		</div>
	</div>

	<div class="grid-2" id="analytics-funnel-row">
		<div class="chart-card" id="analytics-funnel-card">
			<div class="chart-card__header" id="analytics-funnel-header">
				<h3 class="chart-card__title" id="analytics-funnel-title">
					<svg class="chart-card__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
						<rect class="chart-card__icon-rect" x="2" y="5" width="20" height="14" rx="2" />
						<path class="chart-card__icon-path" d="M2 10h20" />
					</svg>
					Failed Payment Recovery
				</h3>
			</div>
			<div class="funnel" id="analytics-funnel-chart" role="img" aria-label="Payment recovery funnel">
				{#each data.funnelSteps as step (step.label)}
					<div class="funnel__row" id={`analytics-funnel-step-${step.label.replace(/\s+/g, '-').toLowerCase()}`}>
						<span class="funnel__label" id={`analytics-funnel-label-${step.label.replace(/\s+/g, '-').toLowerCase()}`}>{step.label}</span>
						<div class="funnel__bar-track" id={`analytics-funnel-track-${step.label.replace(/\s+/g, '-').toLowerCase()}`}>
							<div
								class={`funnel__bar-fill ${step.fillClass}`}
								style={`--bar-width: ${Math.round((step.count / data.maxFunnel) * 100)}%`}
								role="progressbar"
								aria-valuenow={step.count}
								aria-valuemin="0"
								aria-valuemax={data.maxFunnel}
								id={`analytics-funnel-fill-${step.label.replace(/\s+/g, '-').toLowerCase()}`}
							></div>
						</div>
						<span class="funnel__count" id={`analytics-funnel-count-${step.label.replace(/\s+/g, '-').toLowerCase()}`}>{step.count}</span>
						<span class="funnel__pct" id={`analytics-funnel-pct-${step.label.replace(/\s+/g, '-').toLowerCase()}`}>{step.pct}%</span>
					</div>
				{/each}
			</div>
		</div>

		<div class="chart-card chart-card--centered" id="analytics-recovery-rate-card">
			<p class="section-label" id="analytics-recovery-rate-label">Auto-Recovery Rate</p>
			<div class="recovery-rate" id="analytics-recovery-rate-value">{data.autoRecoveryRate}%</div>
			<p class="recovery-rate__label" id="analytics-recovery-rate-description">Average chance of recovery</p>
			<div class="analytics-recovery-rate__badge-wrap" id="analytics-recovery-rate-badge-wrap">
				<span class="badge badge-success" id="analytics-recovery-rate-badge">{data.autoRecoveryRate}%</span>
			</div>
		</div>
	</div>

	<div class="chart-card" id="analytics-cancel-group-card">
		<div class="chart-card__header" id="analytics-cancel-group-header">
			<h3 class="chart-card__title" id="analytics-cancel-group-title">Cancellations by Group</h3>
			<div class="filter-tabs" id="analytics-cancel-group-tabs">
				<button class="filter-tab filter-tab--active" type="button" id="analytics-cancel-group-plan">Plan</button>
				<button class="filter-tab" type="button" id="analytics-cancel-group-channel">Channel</button>
			</div>
		</div>
		<div class="cancel-group" id="analytics-cancel-group-chart" role="img" aria-label="Cancellation rate by plan">
			{#each data.cancelByPlan as group (group.label)}
				<div class="cancel-group__bar" id={`analytics-cancel-group-row-${group.label.toLowerCase()}`}>
					<span class="cancel-group__label" id={`analytics-cancel-group-label-${group.label.toLowerCase()}`}>{group.label}</span>
					<div class="cancel-group__bar-track" id={`analytics-cancel-group-track-${group.label.toLowerCase()}`}>
						<div
							class="cancel-group__fill"
							style={`--bar-width: ${group.pct}%`}
							role="progressbar"
							aria-valuenow={group.pct}
							aria-valuemin="0"
							aria-valuemax="100"
							id={`analytics-cancel-group-fill-${group.label.toLowerCase()}`}
						></div>
					</div>
					<span class={`cancel-group__rate ${group.rateClass}`} id={`analytics-cancel-group-rate-${group.label.toLowerCase()}`}>{group.rate} as usual</span>
				</div>
			{/each}
		</div>
	</div>

	<div class="chart-card" id="analytics-cohort-card">
		<div class="chart-card__header" id="analytics-cohort-header">
			<div class="chart-card__header-copy" id="analytics-cohort-copy">
				<h3 class="chart-card__title" id="analytics-cohort-title">Customer Groups Over Time</h3>
				<p class="chart-card__subtitle" id="analytics-cohort-subtitle">By signup month</p>
			</div>
		</div>
		<div class="analytics-cohort__stats" id="analytics-cohort-stats">
			<div class="analytics-cohort__stat" id="analytics-cohort-stat-retained">
				<p class="analytics-cohort__stat-value analytics-cohort__stat-value--success font-mono" id="analytics-cohort-retained-value">{data.cohortRevenueRetained}%</p>
				<p class="section-label" id="analytics-cohort-retained-label">Revenue Retained</p>
			</div>
			<div class="analytics-cohort__stat" id="analytics-cohort-stat-customers">
				<p class="analytics-cohort__stat-value font-mono" id="analytics-cohort-customers-value">{data.cohortTotalCustomers}</p>
				<p class="section-label" id="analytics-cohort-customers-label">Customers</p>
			</div>
			<div class="analytics-cohort__stat" id="analytics-cohort-stat-groups">
				<p class="analytics-cohort__stat-value font-mono" id="analytics-cohort-groups-value">{data.cohortGroupsCount}</p>
				<p class="section-label" id="analytics-cohort-groups-label">Groups</p>
			</div>
		</div>
		<div class="table-container" id="analytics-cohort-table-container">
			<table class="cohort-table" id="analytics-cohort-table">
				<thead class="cohort-table__head" id="analytics-cohort-head">
					<tr class="cohort-table__head-row" id="analytics-cohort-head-row">
						<th class="cohort-table__heading" id="analytics-cohort-col-group">Group</th>
						<th class="cohort-table__heading" id="analytics-cohort-col-customers">Customers</th>
						<th class="cohort-table__heading" id="analytics-cohort-col-starting">Starting Revenue</th>
						<th class="cohort-table__heading" id="analytics-cohort-col-current">Current Revenue</th>
						<th class="cohort-table__heading" id="analytics-cohort-col-trend">Trend</th>
						<th class="cohort-table__heading" id="analytics-cohort-col-hint">Revenue Hint</th>
						<th class="cohort-table__heading" id="analytics-cohort-col-churn">Churn Rate</th>
						<th class="cohort-table__heading" id="analytics-cohort-col-risk">Average Risk</th>
					</tr>
				</thead>
				<tbody class="cohort-table__body" id="analytics-cohort-body">
					{#each data.cohortGroups as cohort (cohort.group)}
						<tr class="cohort-table__row" id={`analytics-cohort-row-${cohort.group}`}>
							<td class="cohort-table__cell" id={`analytics-cohort-group-${cohort.group}`}>
								<span class="font-mono cohort-table__mono" id={`analytics-cohort-group-value-${cohort.group}`}>{cohort.group}</span>
							</td>
							<td class="cohort-table__cell" id={`analytics-cohort-customers-${cohort.group}`}>
								<span class="font-mono cohort-table__mono" id={`analytics-cohort-customers-value-${cohort.group}`}>{cohort.customers}</span>
							</td>
							<td class="cohort-table__cell" id={`analytics-cohort-starting-${cohort.group}`}>
								<span class="font-mono cohort-table__mono" id={`analytics-cohort-starting-value-${cohort.group}`}>${cohort.startingRevenue.toLocaleString()}</span>
							</td>
							<td class="cohort-table__cell" id={`analytics-cohort-current-${cohort.group}`}>
								<span class="font-mono cohort-table__mono" id={`analytics-cohort-current-value-${cohort.group}`}>${cohort.currentRevenue.toLocaleString()}</span>
							</td>
							<td class="cohort-table__cell" id={`analytics-cohort-trend-${cohort.group}`}>
								<svg class="cohort-sparkline" viewBox="0 0 72 24" fill="none" aria-hidden="true" id={`analytics-cohort-sparkline-${cohort.group}`}>
									<polyline class="cohort-sparkline__line" points={sparklinePoints(cohort.sparkline)} />
								</svg>
							</td>
							<td class="cohort-table__cell" id={`analytics-cohort-hint-${cohort.group}`}>
								<span class={`cohort-table__hint ${cohort.hint.startsWith('+') ? 'cohort-table__hint--up' : 'cohort-table__hint--down'}`} id={`analytics-cohort-hint-value-${cohort.group}`}>{cohort.hint}</span>
							</td>
							<td class="cohort-table__cell" id={`analytics-cohort-churn-${cohort.group}`}>
								<span class={`cancel-group__rate ${cohort.rateClass}`} id={`analytics-cohort-churn-value-${cohort.group}`}>{cohort.churnRate}</span>
							</td>
							<td class="cohort-table__cell" id={`analytics-cohort-risk-${cohort.group}`}>
								<span class={`risk-score risk-score--${riskClass(cohort.avgRisk)}`} id={`analytics-cohort-risk-value-${cohort.group}`}>{cohort.avgRisk.toFixed(1)}</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</section>
