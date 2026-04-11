<script lang="ts">
	import type { PageData } from './$types';
	import type { DriverType, RecoveryCustomerRow } from '$lib/recovery-utils';

	interface Props {
		data: PageData;
	}

	type DemoTab = 'recovery' | 'analytics' | 'monitoring' | 'playbooks' | 'settings';
	type FilterType = 'all' | DriverType | 'high-value';

	let { data }: Props = $props();
	let activeFilter = $state<FilterType>('all');
	let expandedRows = $state<Set<string>>(new Set());

	const demoTabs: Array<{ key: DemoTab; label: string }> = [
		{ key: 'recovery', label: 'Recovery Center' },
		{ key: 'analytics', label: 'Analytics' },
		{ key: 'monitoring', label: 'Monitoring' },
		{ key: 'playbooks', label: 'Email Playbooks' },
		{ key: 'settings', label: 'Settings' }
	];
	const activeTab = $derived((data.tab as DemoTab) ?? 'recovery');
	const activeTabLabel = $derived(
		demoTabs.find((tab) => tab.key === activeTab)?.label ?? 'Recovery Center'
	);
	const currencyFormatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	});

	const filteredCustomers = $derived.by(() => {
		const allCustomers = data.customers as RecoveryCustomerRow[];

		if (activeFilter === 'all') {
			return allCustomers;
		}

		if (activeFilter === 'high-value') {
			return allCustomers.filter((customer) => customer.signal.mrr_amount > 50_000);
		}

		return allCustomers.filter((customer) => customer.driver === activeFilter);
	});

	function formatCurrency(amountCents: number): string {
		return currencyFormatter.format(amountCents / 100);
	}

	function toggleRow(signalId: string): void {
		const next = new Set(expandedRows);

		if (next.has(signalId)) {
			next.delete(signalId);
		} else {
			next.add(signalId);
		}

		expandedRows = next;
	}

	function riskClass(level: string): string {
		return `risk-score--${level}`;
	}

	function driverClass(driver: DriverType): string {
		return `driver-${driver}`;
	}

	function relativeTime(iso: string): string {
		const delta = Date.now() - new Date(iso).getTime();
		const hours = Math.floor(delta / 3_600_000);
		const days = Math.floor(delta / 86_400_000);

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
	<title>Live Demo | ChurnPulse</title>
	<meta
		name="description"
		content="Explore a realistic ChurnPulse recovery workflow with sample at-risk accounts, risk scores, and recovery actions."
	/>
</svelte:head>

<div class="app-shell demo-app-shell" id="demo-app-shell">
	<aside class="sidebar" id="demo-sidebar" aria-label="Demo navigation">
		<a class="sidebar__logo" href="/demo?tab=recovery" id="demo-sidebar-logo" aria-label="ChurnPulse demo">
			<svg
				class="sidebar__logo-icon"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
				id="demo-sidebar-logo-icon"
			>
				<path class="sidebar__logo-path" d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
			</svg>
			<span class="sidebar__wordmark" id="demo-sidebar-wordmark">Churn<em id="demo-sidebar-wordmark-em">Pulse</em></span>
		</a>

		<div class="sidebar__section" id="demo-sidebar-section">
			<span class="sidebar__section-label" id="demo-sidebar-section-label">Demo</span>
			<nav class="sidebar__nav" id="demo-sidebar-nav" aria-label="Demo sections">
				{#each demoTabs as tab (tab.key)}
					<a
						class="nav-item"
						class:nav-item--active={(data.tab as DemoTab) === tab.key}
						href={`/demo?tab=${tab.key}`}
						id={`demo-nav-${tab.key}`}
						aria-current={(data.tab as DemoTab) === tab.key ? 'page' : undefined}
					>
						<span class="nav-item__label" id={`demo-nav-label-${tab.key}`}>{tab.label}</span>
					</a>
				{/each}
			</nav>
		</div>
	</aside>

	<div class="content-column" id="demo-content-column">
		<header class="topbar" id="demo-topbar">
			<div class="topbar__copy" id="demo-topbar-copy">
				<p class="topbar__breadcrumb" id="demo-topbar-breadcrumb">ChurnPulse / Live Demo</p>
				<h1 class="topbar__title" id="demo-topbar-title">{activeTabLabel}</h1>
			</div>
			<div class="topbar__actions" id="demo-topbar-actions">
				<a class="btn btn-secondary btn-sm" href="/docs" id="demo-topbar-docs">Docs</a>
				<a class="btn btn-primary btn-sm" href="/sign-up" id="demo-topbar-signup">Start free</a>
			</div>
		</header>

		<main class="content-area" id="demo-content-area">
			<section class="page" id="demo-page">
				<div class="page__header" id="demo-header">
					<div class="page__header-copy" id="demo-header-copy">
						<p class="page-kicker" id="demo-kicker">Live Demo</p>
						<h1 class="page__title" id="demo-title">{activeTabLabel}</h1>
						{#if activeTab === 'recovery'}
							<p class="page__subtitle" id="demo-subtitle">
								7 sample signals across Stripe, Paddle, Lemon Squeezy, and Polar.
							</p>
						{:else if activeTab === 'analytics'}
							<p class="page__subtitle" id="demo-subtitle">
								Track at-risk MRR, recovery rate, and signal volume in one view.
							</p>
						{:else if activeTab === 'monitoring'}
							<p class="page__subtitle" id="demo-subtitle">
								See the latest at-risk accounts and when each signal was detected.
							</p>
						{:else if activeTab === 'playbooks'}
							<p class="page__subtitle" id="demo-subtitle">
								Preview recovery motions for payment failures, churn intent, and high-value accounts.
							</p>
						{:else}
							<p class="page__subtitle" id="demo-subtitle">
								Review demo workspace settings and connected billing providers.
							</p>
						{/if}
					</div>
					<span class="page__header-badge" id="demo-header-badge">Sample workspace</span>
				</div>
				{#if activeTab === 'recovery'}
					<div class="action-queues" id="demo-action-queues">
						<div class="action-queue" id="demo-queue-payment">
							<div class="action-queue__header" id="demo-queue-payment-header">
								<div class="action-queue__icon action-queue__icon--payment" id="demo-queue-payment-icon">
									<svg class="action-queue__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true" id="demo-queue-payment-svg">
										<rect class="action-queue__icon-rect" x="2" y="5" width="20" height="14" rx="2"></rect>
										<path class="action-queue__icon-path" d="M2 10h20"></path>
									</svg>
								</div>
								<h2 class="action-queue__name" id="demo-queue-payment-name">Payment Issues</h2>
							</div>
							<div class="action-queue__body" id="demo-queue-payment-body">
								<div class="action-queue__count" id="demo-queue-payment-count">{data.totals.payment}</div>
								<p class="action-queue__mrr" id="demo-queue-payment-mrr">{formatCurrency(data.totals.paymentMrr)} MRR at risk</p>
							</div>
							<button class="btn-action" id="demo-queue-payment-button" type="button" onclick={() => (activeFilter = 'payment')}>
								Run Payment Recovery
							</button>
						</div>

						<div class="action-queue" id="demo-queue-cancel">
							<div class="action-queue__header" id="demo-queue-cancel-header">
								<div class="action-queue__icon action-queue__icon--cancel" id="demo-queue-cancel-icon">
									<svg class="action-queue__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true" id="demo-queue-cancel-svg">
										<path class="action-queue__icon-path" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
										<circle class="action-queue__icon-circle" cx="9" cy="7" r="4"></circle>
										<path class="action-queue__icon-path" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
									</svg>
								</div>
								<h2 class="action-queue__name" id="demo-queue-cancel-name">Wants to Cancel</h2>
							</div>
							<div class="action-queue__body" id="demo-queue-cancel-body">
								<div class="action-queue__count" id="demo-queue-cancel-count">{data.totals.cancel}</div>
								<p class="action-queue__mrr" id="demo-queue-cancel-mrr">{formatCurrency(data.totals.cancelMrr)} MRR at risk</p>
							</div>
							<button class="btn-action" id="demo-queue-cancel-button" type="button" onclick={() => (activeFilter = 'cancel')}>
								Launch Save Offers
							</button>
						</div>

						<div class="action-queue" id="demo-queue-high">
							<div class="action-queue__header" id="demo-queue-high-header">
								<div class="action-queue__icon action-queue__icon--high" id="demo-queue-high-icon">
									<svg class="action-queue__icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true" id="demo-queue-high-svg">
										<path class="action-queue__icon-path" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
									</svg>
								</div>
								<h2 class="action-queue__name" id="demo-queue-high-name">High-Value at Risk</h2>
							</div>
							<div class="action-queue__body" id="demo-queue-high-body">
								<div class="action-queue__count" id="demo-queue-high-count">{data.totals.highValue}</div>
								<p class="action-queue__mrr" id="demo-queue-high-mrr">{formatCurrency(data.totals.highMrr)} MRR at risk</p>
							</div>
							<button class="btn-action" id="demo-queue-high-button" type="button" onclick={() => (activeFilter = 'high-value')}>
								Escalate to Account Manager
							</button>
						</div>
					</div>

					<section class="table-container" id="demo-recovery-table-section">
						<div class="demo-recovery-table__header" id="demo-recovery-table-header">
							<h2 class="demo-recovery-table__title" id="demo-recovery-table-title">At-Risk Accounts</h2>
							<div class="filter-tabs" id="demo-recovery-filters" role="tablist">
								<button class="filter-tab" class:filter-tab--active={activeFilter === 'all'} type="button" id="demo-filter-all" onclick={() => (activeFilter = 'all')}>All</button>
								<button class="filter-tab" class:filter-tab--active={activeFilter === 'payment'} type="button" id="demo-filter-payment" onclick={() => (activeFilter = 'payment')}>Payment</button>
								<button class="filter-tab" class:filter-tab--active={activeFilter === 'cancel'} type="button" id="demo-filter-cancel" onclick={() => (activeFilter = 'cancel')}>Cancel</button>
								<button class="filter-tab" class:filter-tab--active={activeFilter === 'high-value'} type="button" id="demo-filter-high-value" onclick={() => (activeFilter = 'high-value')}>High-Value</button>
							</div>
						</div>

						<div class="table-container--overflow" id="demo-recovery-table-scroll">
							<table class="table" id="demo-recovery-table">
								<thead class="table__head" id="demo-recovery-table-head">
									<tr class="table__head-row" id="demo-recovery-table-head-row">
										<th class="table__head-cell" id="demo-col-customer">Customer</th>
										<th class="table__head-cell" id="demo-col-provider">Provider</th>
										<th class="table__head-cell" id="demo-col-plan">Plan</th>
										<th class="table__head-cell" id="demo-col-mrr">MRR</th>
										<th class="table__head-cell" id="demo-col-risk">Risk</th>
										<th class="table__head-cell" id="demo-col-driver">Driver</th>
										<th class="table__head-cell" id="demo-col-seen">Detected</th>
										<th class="table__head-cell" id="demo-col-expand"></th>
									</tr>
								</thead>
								<tbody class="table__body" id="demo-recovery-table-body">
									{#each filteredCustomers as customer (customer.signal.id)}
										{@const isExpanded = expandedRows.has(customer.signal.id)}
										<tr class:table__row--expanded={isExpanded} id={`demo-row-${customer.signal.id}`} onclick={() => toggleRow(customer.signal.id)}>
											<td class="table__cell" id={`demo-customer-${customer.signal.id}`}>
												<div class="demo-recovery-table__customer" id={`demo-customer-copy-${customer.signal.id}`}>
													<p class="demo-recovery-table__customer-name" id={`demo-customer-name-${customer.signal.id}`}>{customer.signal.customer_name ?? 'Unknown customer'}</p>
													<p class="demo-recovery-table__customer-email" id={`demo-customer-email-${customer.signal.id}`}>{customer.signal.customer_email ?? 'No email on file'}</p>
												</div>
											</td>
											<td class="table__cell" id={`demo-provider-${customer.signal.id}`}>
												<span class="plan-badge" id={`demo-provider-badge-${customer.signal.id}`}>{customer.signal.provider}</span>
											</td>
											<td class="table__cell" id={`demo-plan-${customer.signal.id}`}>
												<span class="plan-badge" id={`demo-plan-badge-${customer.signal.id}`}>{customer.plan}</span>
											</td>
											<td class="table__cell table__align-right" id={`demo-mrr-${customer.signal.id}`}>
												<span class="font-mono" id={`demo-mrr-value-${customer.signal.id}`}>{formatCurrency(customer.signal.mrr_amount)}</span>
											</td>
											<td class="table__cell" id={`demo-risk-${customer.signal.id}`}>
												<span class={`risk-score ${riskClass(customer.riskLevel)}`} id={`demo-risk-score-${customer.signal.id}`}>{customer.riskScore}</span>
											</td>
											<td class="table__cell" id={`demo-driver-${customer.signal.id}`}>
												<span class={`driver-badge ${driverClass(customer.driver)}`} id={`demo-driver-badge-${customer.signal.id}`}>{customer.driverLabel}</span>
											</td>
											<td class="table__cell" id={`demo-detected-${customer.signal.id}`}>
												<span class="text-secondary" id={`demo-detected-value-${customer.signal.id}`}>{relativeTime(customer.signal.detected_at)}</span>
											</td>
											<td class="table__cell" id={`demo-expand-${customer.signal.id}`}>
												<svg class="table__chevron" class:table__chevron--open={isExpanded} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" id={`demo-chevron-${customer.signal.id}`}>
													<path class="table__chevron-path" d="m6 9 6 6 6-6"></path>
												</svg>
											</td>
										</tr>
										{#if isExpanded}
											<tr class="table__expansion-row" id={`demo-expansion-row-${customer.signal.id}`}>
												<td class="table__expansion" colspan="8" id={`demo-expansion-${customer.signal.id}`}>
													<div class="expansion-grid" id={`demo-expansion-grid-${customer.signal.id}`}>
														{#each customer.expansionSignals as signal (signal.name)}
															<div class="expansion-signal" id={`demo-expansion-signal-${customer.signal.id}-${signal.name.replaceAll(' ', '-').toLowerCase()}`}>
																<div class="demo-expansion-signal__header" id={`demo-expansion-header-${customer.signal.id}-${signal.name.replaceAll(' ', '-').toLowerCase()}`}>
																	<span class="expansion-signal__name" id={`demo-expansion-name-${customer.signal.id}-${signal.name.replaceAll(' ', '-').toLowerCase()}`}>{signal.name}</span>
																	<span class={`severity-pill severity-pill--${signal.severity}`} id={`demo-expansion-severity-${customer.signal.id}-${signal.name.replaceAll(' ', '-').toLowerCase()}`}>{signal.severity}</span>
																</div>
																<div class="expansion-signal__bar" id={`demo-expansion-bar-${customer.signal.id}-${signal.name.replaceAll(' ', '-').toLowerCase()}`}>
																	<div
																		class={`expansion-signal__fill ${signal.severity === 'urgent' ? 'expansion-signal__fill--danger' : signal.severity === 'medium' ? 'expansion-signal__fill--warning' : 'expansion-signal__fill--success'}`}
																		id={`demo-expansion-fill-${customer.signal.id}-${signal.name.replaceAll(' ', '-').toLowerCase()}`}
																		style={`--expansion-width: ${signal.pct}%`}
																	></div>
																</div>
																<span class="expansion-signal__value" id={`demo-expansion-value-${customer.signal.id}-${signal.name.replaceAll(' ', '-').toLowerCase()}`}>{signal.value}</span>
															</div>
														{/each}
													</div>
													<div class="demo-expansion-actions" id={`demo-expansion-actions-${customer.signal.id}`}>
														<a class="btn btn-success btn-sm" href="/sign-up" id={`demo-action-recover-${customer.signal.id}`}>Mark Recovered</a>
														<a class="btn btn-secondary btn-sm" href="/sign-up" id={`demo-action-dismiss-${customer.signal.id}`}>Dismiss</a>
														<a class="btn btn-ghost btn-sm" href="/sign-up" id={`demo-action-sequence-${customer.signal.id}`}>Send Sequence</a>
													</div>
												</td>
											</tr>
										{/if}
									{/each}
								</tbody>
							</table>
						</div>
					</section>
				{:else if activeTab === 'analytics'}
					<div class="action-queues" id="demo-analytics-queues">
						<div class="action-queue"><div class="action-queue__body"><div class="action-queue__count">{formatCurrency(data.stats.atRiskMrr)}</div><p class="action-queue__mrr">At-risk MRR</p></div></div>
						<div class="action-queue"><div class="action-queue__body"><div class="action-queue__count">{data.stats.activeSignals}</div><p class="action-queue__mrr">Active signals</p></div></div>
						<div class="action-queue"><div class="action-queue__body"><div class="action-queue__count">{data.stats.recoveryRate}%</div><p class="action-queue__mrr">Recovery rate</p></div></div>
					</div>
					<section class="table-container">
						<div class="demo-recovery-table__header"><h2 class="demo-recovery-table__title">Signal mix</h2></div>
						<div class="table-container--overflow">
							<table class="table">
								<thead class="table__head"><tr class="table__head-row"><th class="table__head-cell">Signal</th><th class="table__head-cell">Count</th></tr></thead>
								<tbody class="table__body">
									{#each Object.entries(data.stats.countsBySignalType) as [signalType, count]}
										<tr><td class="table__cell">{signalType}</td><td class="table__cell">{count}</td></tr>
									{/each}
								</tbody>
							</table>
						</div>
					</section>
				{:else if activeTab === 'monitoring'}
					<section class="table-container">
						<div class="demo-recovery-table__header"><h2 class="demo-recovery-table__title">Recent signals</h2></div>
						<div class="table-container--overflow">
							<table class="table">
								<thead class="table__head"><tr class="table__head-row"><th class="table__head-cell">Customer</th><th class="table__head-cell">Provider</th><th class="table__head-cell">Status</th><th class="table__head-cell">Detected</th></tr></thead>
								<tbody class="table__body">
									{#each data.customers as customer (customer.signal.id)}
										<tr>
											<td class="table__cell">{customer.signal.customer_name}</td>
											<td class="table__cell">{customer.signal.provider}</td>
											<td class="table__cell">{customer.signal.status}</td>
											<td class="table__cell">{relativeTime(customer.signal.detected_at)}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</section>
				{:else if activeTab === 'playbooks'}
					<div class="action-queues">
						<div class="action-queue"><div class="action-queue__body"><div class="action-queue__count">{data.totals.payment}</div><p class="action-queue__mrr">Payment recovery playbooks</p></div></div>
						<div class="action-queue"><div class="action-queue__body"><div class="action-queue__count">{data.totals.cancel}</div><p class="action-queue__mrr">Save offer playbooks</p></div></div>
						<div class="action-queue"><div class="action-queue__body"><div class="action-queue__count">{data.stats.scheduledToday}</div><p class="action-queue__mrr">Emails scheduled today</p></div></div>
					</div>
				{:else if activeTab === 'settings'}
					<section class="table-container">
						<div class="demo-recovery-table__header"><h2 class="demo-recovery-table__title">Connected providers</h2></div>
						<div class="table-container--overflow">
							<table class="table">
								<thead class="table__head"><tr class="table__head-row"><th class="table__head-cell">Provider</th><th class="table__head-cell">Demo status</th></tr></thead>
								<tbody class="table__body">
									<tr><td class="table__cell">Stripe</td><td class="table__cell">Connected</td></tr>
									<tr><td class="table__cell">Paddle</td><td class="table__cell">Connected</td></tr>
									<tr><td class="table__cell">Lemon Squeezy</td><td class="table__cell">Connected</td></tr>
									<tr><td class="table__cell">Polar</td><td class="table__cell">Connected</td></tr>
								</tbody>
							</table>
						</div>
					</section>
				{/if}

				<section class="chart-card demo-signup-card" id="demo-signup-card">
					<div class="chart-card__header" id="demo-signup-header">
						<div class="demo-signup-card__copy" id="demo-signup-copy">
							<h2 class="chart-card__title" id="demo-signup-title">See this with your real accounts</h2>
							<p class="chart-card__subtitle" id="demo-signup-subtitle">
								Connect a billing platform and start scoring live churn risk in under a minute.
							</p>
						</div>
						<a class="btn btn-primary btn-lg" href="/sign-up" id="demo-signup-button">Sign up free</a>
					</div>
				</section>
			</section>
		</main>
	</div>

	<div class="demo-mode-card" id="demo-mode-card">
		<p class="demo-mode-card__label" id="demo-mode-card-label">Workspace</p>
		<p class="demo-mode-card__text" id="demo-mode-card-text">
			Connected workspace controls and integration status.
		</p>
	</div>
</div>
