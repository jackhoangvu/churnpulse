<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import type { DriverType } from '$lib/recovery-utils';

	interface Props {
		data: PageData;
	}

	type FilterType = 'all' | DriverType | 'high-value';

	let { data }: Props = $props();
	let expandedRows = $state<Set<string>>(new Set());
	let submittingId = $state<string | null>(null);

	const currencyFormatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	});
	const activeFilter = $derived((page.url.searchParams.get('filter') as FilterType) ?? 'all');
	const filteredCustomers = $derived.by(() => {
		const customers = data.customers ?? [];

		if (activeFilter === 'all') {
			return customers;
		}

		if (activeFilter === 'high-value') {
			return customers.filter((customer) => customer.signal.mrr_amount > 50_000);
		}

		return customers.filter((customer) => customer.driver === activeFilter);
	});

	function toggleRow(id: string): void {
		const next = new Set(expandedRows);

		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
			setTimeout(() => {
				(document.getElementById(`recovery-expansion-grid-${id}`) as HTMLDivElement | null)?.focus();
			}, 50);
		}

		expandedRows = next;
	}

	function setFilter(filter: FilterType): void {
		const url = new URL(page.url);
		url.searchParams.set('filter', filter);
		void goto(url.toString(), { replaceState: true, noScroll: true });
	}

	function formatCurrency(cents: number): string {
		return currencyFormatter.format(cents / 100);
	}

	function driverClass(driver: DriverType): string {
		return `driver-${driver}`;
	}
</script>

<svelte:head>
	<title>Recovery Center | ChurnPulse</title>
	<meta
		name="description"
		content="Take action on at-risk customers before they churn. Payment recovery, save offers, and high-value escalations."
	/>
</svelte:head>

{#if !data.connected}
	<section class="page recovery-connect" id="recovery-connect">
		<div class="card card-brand recovery-connect__card" id="recovery-connect-card">
			<div class="recovery-connect__icon" id="recovery-connect-icon" aria-hidden="true">
				<svg
					class="recovery-connect__icon-svg"
					viewBox="0 0 48 48"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
				>
					<path class="recovery-connect__icon-path" d="M8 16h28c4 0 8 3.6 8 8s-4 8-8 8H8V16zm24 16c4 0 6-1.8 6-8s-2-8-6-8H14v16h18z" />
				</svg>
			</div>
			<h2 class="recovery-connect__title" id="recovery-connect-title">Connect your billing platform</h2>
			<p class="recovery-connect__copy" id="recovery-connect-copy">
				Read-only access. 60-second setup. See at-risk customers immediately.
			</p>
			<a class="btn btn-primary btn-full" href="/api/polar/connect" id="recovery-connect-button">
				Connect Polar to start -&gt;
			</a>
			<p class="recovery-connect__footnote" id="recovery-connect-footnote">
				Also supports Stripe, Paddle, and Lemon Squeezy. Connect in Settings -&gt; Integrations.
			</p>
		</div>
	</section>
{:else}
	<section class="page recovery-page" id="recovery-page">
		<div class="page__header" id="recovery-header">
			<div class="page__header-copy" id="recovery-header-copy">
				<h1 class="page__title" id="recovery-title">Recovery Center</h1>
				<p class="page__subtitle" id="recovery-subtitle">
					{data.month} - {filteredCustomers.length} accounts need attention
				</p>
			</div>
			<span class="page__header-badge" id="recovery-health-badge">
				<svg
					class="page__header-badge-icon"
					width="12"
					height="12"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path class="page__header-badge-path" d="M22 12h-4l-3 9L9 3l-3 9H2" />
				</svg>
				Monitoring active
			</span>
		</div>

		<div class="action-queues" id="action-queues">
			<div class="action-queue" id="queue-payment">
				<div class="action-queue__header" id="queue-payment-header">
					<div class="action-queue__icon action-queue__icon--payment" id="queue-payment-icon" aria-hidden="true">
						<svg class="action-queue__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
							<rect class="action-queue__icon-rect" x="2" y="5" width="20" height="14" rx="2" />
							<path class="action-queue__icon-path" d="M2 10h20" />
						</svg>
					</div>
					<h3 class="action-queue__name" id="queue-payment-name">Payment Issues</h3>
				</div>
				<div class="action-queue__body" id="queue-payment-body">
					<div class="action-queue__count" id="queue-payment-count">{data.totals.payment}</div>
					<p class="action-queue__mrr" id="queue-payment-mrr">
						{formatCurrency(data.totals.paymentMrr)} MRR at risk
					</p>
				</div>
				<button class="btn-action" id="queue-payment-cta" type="button" onclick={() => setFilter('payment')}>
					Run Payment Recovery
				</button>
			</div>

			<div class="action-queue" id="queue-cancel">
				<div class="action-queue__header" id="queue-cancel-header">
					<div class="action-queue__icon action-queue__icon--cancel" id="queue-cancel-icon" aria-hidden="true">
						<svg class="action-queue__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
							<path class="action-queue__icon-path" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
							<circle class="action-queue__icon-circle" cx="9" cy="7" r="4" />
							<path class="action-queue__icon-path" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
						</svg>
					</div>
					<h3 class="action-queue__name" id="queue-cancel-name">Wants to Cancel</h3>
				</div>
				<div class="action-queue__body" id="queue-cancel-body">
					<div class="action-queue__count" id="queue-cancel-count">{data.totals.cancel}</div>
					<p class="action-queue__mrr" id="queue-cancel-mrr">
						{formatCurrency(data.totals.cancelMrr)} MRR at risk
					</p>
				</div>
				<button class="btn-action" id="queue-cancel-cta" type="button" onclick={() => setFilter('cancel')}>
					Launch Save Offers
				</button>
			</div>

			<div class="action-queue" id="queue-high">
				<div class="action-queue__header" id="queue-high-header">
					<div class="action-queue__icon action-queue__icon--high" id="queue-high-icon" aria-hidden="true">
						<svg class="action-queue__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
							<path class="action-queue__icon-path" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
						</svg>
					</div>
					<h3 class="action-queue__name" id="queue-high-name">High-Value at Risk</h3>
				</div>
				<div class="action-queue__body" id="queue-high-body">
					<div class="action-queue__count" id="queue-high-count">{data.totals.highValue}</div>
					<p class="action-queue__mrr" id="queue-high-mrr">
						{formatCurrency(data.totals.highMrr)} MRR at risk
					</p>
				</div>
				<button class="btn-action" id="queue-high-cta" type="button" onclick={() => setFilter('high-value')}>
					Escalate to Account Manager
				</button>
			</div>
		</div>

		<div class="perf-metrics" id="perf-metrics">
			<div class="perf-metric card" id="perf-spotting">
				<div class="perf-metric__header" id="perf-spotting-header">
					<span class="perf-metric__name" id="perf-spotting-name">Prediction Accuracy</span>
					<svg class="perf-metric__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
						<circle class="perf-metric__icon-circle" cx="12" cy="12" r="10" />
						<path class="perf-metric__icon-path" d="M12 8v4l3 3" />
					</svg>
				</div>
				<div class="quality-label quality-label--strong perf-metric__label" id="perf-spotting-label">Strong</div>
				<div class="perf-metric__stat" id="perf-spotting-stat">
					{data.accuracy.spotting}% - Reliably spotting at-risk customers
				</div>
			</div>

			<div class="perf-metric card" id="perf-warning">
				<div class="perf-metric__header" id="perf-warning-header">
					<span class="perf-metric__name" id="perf-warning-name">Early Warning Power</span>
					<svg class="perf-metric__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
						<path class="perf-metric__icon-path" d="M3 3l4 4M21 3l-4 4M12 8v4M8 21l4-5 4 5M12 2v2" />
					</svg>
				</div>
				<div class="quality-label quality-label--excellent perf-metric__label" id="perf-warning-label">Excellent</div>
				<div class="perf-metric__stat" id="perf-warning-stat">
					{data.accuracy.earlyWarning}x - Top flags are highly predictive
				</div>
			</div>

			<div class="perf-metric card" id="perf-churn">
				<div class="perf-metric__header" id="perf-churn-header">
					<span class="perf-metric__name" id="perf-churn-name">Churn Rate</span>
					<svg class="perf-metric__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
						<path class="perf-metric__icon-path" d="M22 12h-4l-3 9L9 3l-3 9H2" />
					</svg>
				</div>
				<div class="quality-label quality-label--normal perf-metric__label" id="perf-churn-label">Normal</div>
				<div class="perf-metric__stat" id="perf-churn-stat">
					{data.accuracy.churnRate}% - Typical for subscription businesses
				</div>
			</div>
		</div>

		<section class="table-container" id="recovery-table-section">
			<div class="recovery-table__header" id="recovery-table-header">
				<h2 class="recovery-table__title" id="recovery-table-title">At-Risk Accounts</h2>
				<div class="filter-tabs" id="recovery-table-filters" role="tablist" aria-label="Account filters">
					{#each [
						{ key: 'all' as FilterType, label: 'All' },
						{ key: 'payment' as FilterType, label: 'Payment Issues' },
						{ key: 'cancel' as FilterType, label: 'Wants to Cancel' },
						{ key: 'high-value' as FilterType, label: 'High-Value' }
					] as tab (tab.key)}
						<button
							class="filter-tab"
							class:filter-tab--active={activeFilter === tab.key}
							id={`recovery-filter-${tab.key}`}
							type="button"
							role="tab"
							aria-selected={activeFilter === tab.key}
							aria-controls="recovery-table-panel"
							onclick={() => setFilter(tab.key)}
						>
							{tab.label}
						</button>
					{/each}
				</div>
			</div>

			{#if filteredCustomers.length === 0}
				<div class="empty-state" id="recovery-empty">
					<p class="empty-state__message" id="recovery-empty-message">No accounts match this filter.</p>
				</div>
			{:else}
				<div class="table-container--overflow" id="recovery-table-scroll" role="tabpanel" aria-labelledby={`recovery-filter-${activeFilter}`} aria-label="Recovery table" tabindex="-1">
					<table class="table" id="recovery-table">
						<thead class="table__head" id="recovery-table-head">
							<tr class="table__head-row" id="recovery-table-head-row">
								<th class="table__heading" id="recovery-col-customer">Customer</th>
								<th class="table__heading" id="recovery-col-plan">Plan</th>
								<th class="table__heading table__align-right" id="recovery-col-mrr">MRR</th>
								<th class="table__heading" id="recovery-col-risk">Risk</th>
								<th class="table__heading" id="recovery-col-driver">Driver</th>
								<th class="table__heading recovery-table__expand-heading" id="recovery-col-expand">Expand</th>
							</tr>
						</thead>
						<tbody class="table__body" id="recovery-tbody">
							{#each filteredCustomers as row (row.signal.id)}
								{@const isExpanded = expandedRows.has(row.signal.id)}
								<tr
									class:table__row--expanded={isExpanded}
									class="recovery-table__row"
									id={`recovery-row-${row.signal.id}`}
									tabindex="0"
									role="button"
									aria-expanded={isExpanded}
									aria-controls={`recovery-expansion-${row.signal.id}`}
									onclick={(event) => {
										if ((event.target as HTMLElement).closest('button, a, form')) return;
										toggleRow(row.signal.id);
									}}
									onkeydown={(event) => {
										if (event.key === 'Enter' || event.key === ' ') {
											event.preventDefault();
											toggleRow(row.signal.id);
										}
									}}
								>
									<td class="table__cell" id={`recovery-customer-${row.signal.id}`}>
										<div class="table-customer" id={`recovery-customer-block-${row.signal.id}`}>
											<div class="table-customer__name" id={`recovery-customer-name-${row.signal.id}`}>
												{row.signal.customer_name ?? 'Unknown customer'}
											</div>
											<div class="table-customer__meta" id={`recovery-customer-email-${row.signal.id}`}>
												{row.signal.customer_email ?? 'No email'}
											</div>
										</div>
									</td>
									<td class="table__cell" id={`recovery-plan-${row.signal.id}`}>
										<span class="plan-badge" id={`recovery-plan-badge-${row.signal.id}`}>{row.plan}</span>
									</td>
									<td class="table__cell table__align-right" id={`recovery-mrr-${row.signal.id}`}>
										<span class="font-mono table-mrr" id={`recovery-mrr-value-${row.signal.id}`}>
											{formatCurrency(row.signal.mrr_amount)}
										</span>
									</td>
									<td class="table__cell" id={`recovery-risk-${row.signal.id}`}>
										<span class={`risk-score risk-score--${row.riskLevel}`} id={`recovery-risk-value-${row.signal.id}`}>
											{row.riskScore}
										</span>
									</td>
									<td class="table__cell" id={`recovery-driver-${row.signal.id}`}>
										<span class={`driver-badge ${driverClass(row.driver)}`} id={`recovery-driver-badge-${row.signal.id}`}>
											{row.driverLabel}
										</span>
									</td>
									<td class="table__cell recovery-table__expand-cell" id={`recovery-expand-${row.signal.id}`}>
										<svg class="table__chevron" class:table__chevron--open={isExpanded} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
											<path class="table__chevron-path" d="m6 9 6 6 6-6" />
										</svg>
									</td>
								</tr>
								{#if isExpanded}
									<tr class="table__expansion-row" id={`recovery-expansion-row-${row.signal.id}`}>
										<td class="table__expansion" colspan="6" id={`recovery-expansion-${row.signal.id}`}>
											<div
												class="expansion-grid"
												id={`recovery-expansion-grid-${row.signal.id}`}
												tabindex="-1"
											>
												{#each row.expansionSignals as signal (signal.name)}
													<div class="expansion-signal" id={`recovery-expansion-signal-${row.signal.id}-${signal.name.replaceAll(' ', '-').toLowerCase()}`}>
														<div class="expansion-signal__header" id={`recovery-expansion-header-${row.signal.id}-${signal.name.replaceAll(' ', '-').toLowerCase()}`}>
															<span class="expansion-signal__name" id={`recovery-expansion-name-${row.signal.id}-${signal.name.replaceAll(' ', '-').toLowerCase()}`}>{signal.name}</span>
															<span class={`severity-pill severity-pill--${signal.severity}`} id={`recovery-expansion-severity-${row.signal.id}-${signal.name.replaceAll(' ', '-').toLowerCase()}`}>
																{signal.severity}
															</span>
														</div>
														<div class="expansion-signal__bar" id={`recovery-expansion-bar-${row.signal.id}-${signal.name.replaceAll(' ', '-').toLowerCase()}`}>
															<div
																class={`expansion-signal__fill expansion-signal__fill--${
																	signal.severity === 'urgent'
																		? 'danger'
																		: signal.severity === 'medium'
																			? 'warning'
																			: 'success'
																}`}
																style={`--signal-width: ${signal.pct}%`}
																role="progressbar"
																aria-valuenow={signal.pct}
																aria-valuemin="0"
																aria-valuemax="100"
																id={`recovery-expansion-fill-${row.signal.id}-${signal.name.replaceAll(' ', '-').toLowerCase()}`}
															></div>
														</div>
														<span class="expansion-signal__value" id={`recovery-expansion-value-${row.signal.id}-${signal.name.replaceAll(' ', '-').toLowerCase()}`}>{signal.value}</span>
													</div>
												{/each}
											</div>
											<div class="expansion-actions" id={`recovery-expansion-actions-${row.signal.id}`}>
												<form
													class="expansion-actions__form"
													method="POST"
													action="?/markRecovered"
													id={`recovery-recovered-form-${row.signal.id}`}
													use:enhance={({ formData }) => {
														const signalId = String(formData.get('signalId') ?? '');
														submittingId = signalId;
														return async ({ update }) => {
															submittingId = null;
															await update({ reset: false });
														};
													}}
												>
													<input class="sr-only" type="hidden" name="signalId" value={row.signal.id} />
													<button
														class="btn btn-success btn-sm"
														type="submit"
														id={`recovery-mark-recovered-${row.signal.id}`}
														disabled={submittingId === row.signal.id}
														aria-busy={submittingId === row.signal.id}
													>
														{submittingId === row.signal.id ? 'Saving...' : 'Mark Recovered'}
													</button>
												</form>
												<form
													class="expansion-actions__form"
													method="POST"
													action="?/dismiss"
													id={`recovery-dismiss-form-${row.signal.id}`}
													onsubmit={(event) => {
														if (!window.confirm('Dismiss this signal from the recovery queue?')) {
															event.preventDefault();
															return;
														}
													}}
													use:enhance={({ formData }) => {
														const signalId = String(formData.get('signalId') ?? '');
														submittingId = signalId;
														return async ({ update }) => {
															submittingId = null;
															await update({ reset: false });
														};
													}}
												>
													<input class="sr-only" type="hidden" name="signalId" value={row.signal.id} />
													<button
														class="btn btn-secondary btn-sm"
														type="submit"
														id={`recovery-dismiss-${row.signal.id}`}
														disabled={submittingId === row.signal.id}
														aria-busy={submittingId === row.signal.id}
													>
														{submittingId === row.signal.id ? 'Saving...' : 'Dismiss'}
													</button>
												</form>
												<a class="btn btn-ghost btn-sm" href="/dashboard/playbooks" id={`recovery-send-sequence-${row.signal.id}`}>Send Sequence</a>
											</div>
										</td>
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</section>
	</section>
{/if}
