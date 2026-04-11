<script lang="ts">
	import { enhance } from '$app/forms';
	import Badge from '$lib/components/ui/Badge.svelte';
	import SequenceProgress from '$lib/components/dashboard/SequenceProgress.svelte';
	import type { SignalType } from '$lib/types';

	type TabKey = 'pending' | 'sent' | 'failed';

	let { data, form } = $props();
	let filtering = $state(false);
	let submittingEmailId = $state<string | null>(null);

	const groupMap = $derived(
		new Map(data.groups.map((group) => [group.signal_id, group.emails]))
	);
	const activeTab = $derived(data.filters.status as TabKey);
	const activeRows = $derived(
		activeTab === 'pending'
			? data.rows.upcoming
			: activeTab === 'sent'
				? data.rows.sent
				: data.rows.failed
	);

	function truncate(value: string, maxLength: number): string {
		return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`;
	}

	function buildUrl(status: TabKey): string {
		const params = new URLSearchParams();
		params.set('status', status);

		if (data.filters.signalType !== 'all') {
			params.set('signal_type', data.filters.signalType);
		}

		if (data.filters.from) {
			params.set('from', data.filters.from);
		}

		if (data.filters.to) {
			params.set('to', data.filters.to);
		}

		const search = params.toString();
		return search ? `/dashboard/sequences?${search}` : '/dashboard/sequences';
	}

	function formatExactDate(dateString: string | null, variant: 'scheduled' | 'sent'): string {
		if (!dateString) {
			return variant === 'scheduled' ? 'Not scheduled' : 'Not sent';
		}

		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(dateString));
	}

	function formatRelativeBucket(dateString: string | null, tab: TabKey): string {
		if (!dateString) {
			return tab === 'sent' ? 'Recently sent' : 'Queued later';
		}

		const now = new Date(data.nowIso);
		const target = new Date(dateString);
		const diffMs = target.getTime() - now.getTime();
		const diffHours = Math.round(Math.abs(diffMs) / (1000 * 60 * 60));
		const diffDays = Math.round(Math.abs(diffMs) / (1000 * 60 * 60 * 24));

		if (tab === 'sent') {
			if (diffHours < 24) {
				return diffHours <= 1 ? 'Sent within the hour' : `Sent ${diffHours} hours ago`;
			}

			return diffDays <= 1 ? 'Sent 1 day ago' : `Sent ${diffDays} days ago`;
		}

		if (diffMs <= 0) {
			return 'Now';
		}

		if (diffHours < 24) {
			return diffHours <= 1 ? 'In 1 hour' : `In ${diffHours} hours`;
		}

		if (diffDays === 1) {
			return 'Tomorrow';
		}

		return `In ${diffDays} days`;
	}

	function groupHeaderLabel(dateString: string | null, tab: TabKey): string {
		const bucket = formatRelativeBucket(dateString, tab).toUpperCase();
		return tab === 'sent' ? bucket : `SENDING ${bucket}`;
	}

	function rightSideLabel(row: (typeof data.rows.upcoming)[number], tab: TabKey): string {
		if (tab === 'sent') {
			return formatExactDate(row.sent_at ?? row.created_at, 'sent');
		}

		return formatExactDate(row.scheduled_for ?? row.created_at, 'scheduled');
	}

	function shouldRenderGroupLabel(
		index: number,
		rows: typeof activeRows,
		tab: TabKey
	): boolean {
		if (index === 0) {
			return true;
		}

		const previous = rows[index - 1];
		const current = rows[index];
		const previousDate =
			tab === 'sent'
				? previous.sent_at ?? previous.created_at
				: previous.scheduled_for ?? previous.created_at;
		const currentDate =
			tab === 'sent'
				? current.sent_at ?? current.created_at
				: current.scheduled_for ?? current.created_at;

		return formatRelativeBucket(previousDate, tab) !== formatRelativeBucket(currentDate, tab);
	}

	const emptyState = $derived(
		activeTab === 'pending'
			? {
					title: 'No upcoming emails',
					description:
						'There are no pending sequence emails matching the current filters. New recovery steps will appear here as soon as they are scheduled.'
				}
			: activeTab === 'sent'
				? {
						title: 'Nothing has been sent yet',
						description:
							'Sent emails will appear here once your active sequences start reaching customers.'
					}
				: {
						title: 'No failed sends',
						description:
							'Delivery issues and sequence errors will surface here so your team can retry them quickly.'
				}
	);

	$effect(() => {
		data.nowIso;
		filtering = false;
	});
</script>

<svelte:head>
	<title>Sequences | ChurnPulse</title>
	<meta
		name="description"
		content="Monitor scheduled churn-prevention emails, delivery failures, and sequence progress across your ChurnPulse workspace."
	/>
</svelte:head>

<section class="sequence-page">
	<div class="page-header">
		<div class="page-header__copy">
			<p class="page-header__kicker">
				Retention sequences
			</p>
			<h2 class="page-header__title">Queue, review, and rescue revenue on schedule.</h2>
			<p class="page-header__subtitle">
				Every scheduled email is organized by customer, signal, and sequence step so your
				operators can intervene before a recovery path stalls.
			</p>
		</div>

		<div class="page-header__actions">
			<a class="btn btn-secondary btn-sm" href="/dashboard/sequences/templates">
				View templates
			</a>
		</div>
	</div>

	{#if form?.message}
		<div class="settings-notice settings-notice--success">
			<p class="settings-muted">{form.message}</p>
		</div>
	{/if}

	<div class="sequence-page__stats">
		<article class="sequence-page__stat card">
			<p class="section-label">
				Emails Sent Today
			</p>
			<p class="sequence-page__stat-value">{data.stats.sentToday}</p>
			<p class="settings-muted">
				{data.stats.sentThisWeek} delivered so far this week.
			</p>
		</article>

		<article class="sequence-page__stat card">
			<p class="section-label">
				Scheduled This Week
			</p>
			<p class="sequence-page__stat-value">{data.stats.scheduledThisWeek}</p>
			<p class="settings-muted">
				{data.stats.totalPending} pending across all active sequences.
			</p>
		</article>

		<article class="sequence-page__stat card">
			<p class="section-label">
				Failed (needs attention)
			</p>
			<p
				class="sequence-page__stat-value"
				class:sequence-page__stat-value--danger={data.stats.failed > 0}
			>
				{data.stats.failed}
			</p>
			<p class="settings-muted">
				Workspace success rate: {data.stats.successRate}%.
			</p>
		</article>
	</div>

	<div class="sequence-page__panel card">
		<div class="sequence-page__toolbar">
			<div class="sequence-page__tabs">
				<a class="tab" class:tab-active={activeTab === 'pending'} href={buildUrl('pending')}>
					Upcoming
					<span class="tab-count">{data.tabCounts.upcoming}</span>
				</a>
				<a class="tab" class:tab-active={activeTab === 'sent'} href={buildUrl('sent')}>
					Sent
					<span class="tab-count">{data.tabCounts.sent}</span>
				</a>
				<a class="tab" class:tab-active={activeTab === 'failed'} href={buildUrl('failed')}>
					Failed
					<span class="tab-count">{data.tabCounts.failed}</span>
				</a>
			</div>

			<div class="sequence-page__meta">
				<span class="section-label">{data.orgName}</span>
				<span>Live success rate: {data.stats.successRate}%</span>
			</div>
		</div>

		<form class="sequence-page__filter-form" method="GET" onsubmit={() => { filtering = true; }}>
			<label class="filter-field">
				<span class="filter-label">Status</span>
				<select class="filter-input" name="status" value={data.filters.status}>
					<option value="pending">Upcoming</option>
					<option value="sent">Sent</option>
					<option value="failed">Failed</option>
				</select>
			</label>

			<label class="filter-field">
				<span class="filter-label">Signal type</span>
				<select class="filter-input" name="signal_type" value={data.filters.signalType}>
					<option value="all">All signal types</option>
					{#each data.filterOptions as signalType (signalType)}
						<option value={signalType}>{signalType.replaceAll('_', ' ')}</option>
					{/each}
				</select>
			</label>

			<label class="filter-field">
				<span class="filter-label">From</span>
				<input class="filter-input" type="date" name="from" value={data.filters.from} />
			</label>

			<label class="filter-field">
				<span class="filter-label">To</span>
				<input class="filter-input" type="date" name="to" value={data.filters.to} />
			</label>

			<button class="filter-button filter-button-primary" type="submit" disabled={filtering} aria-busy={filtering}>
				{filtering ? 'Filtering...' : 'Apply filters'}
			</button>
			<a class="filter-button" href={buildUrl(activeTab)}>Reset range</a>
		</form>
	</div>

	<section class="sequence-page__list">
		{#if activeRows.length === 0}
			<div class="sequence-page__empty">
				<div class="sequence-empty-icon" id="sequence-empty-icon" aria-hidden="true">
					<svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" id="sequence-empty-svg">
						{#if activeTab === 'pending'}
							<circle cx="24" cy="24" r="20" stroke="var(--border-strong)" />
							<path d="M24 14v10l6 6" stroke="var(--brand)" stroke-linecap="round" />
						{:else if activeTab === 'sent'}
							<circle cx="24" cy="24" r="20" stroke="var(--border-strong)" />
							<path d="M16 24l6 6 10-10" stroke="var(--success)" stroke-linecap="round" stroke-linejoin="round" />
						{:else}
							<circle cx="24" cy="24" r="20" stroke="var(--border-strong)" />
							<path d="M24 16v8M24 30h.01" stroke="var(--warning)" stroke-linecap="round" />
						{/if}
					</svg>
				</div>
				<h3 class="sequence-empty__title">{emptyState.title}</h3>
				<p class="sequence-empty__desc">{emptyState.description}</p>
				{#if activeTab === 'pending'}
					<a class="btn btn-primary btn-sm" href="/dashboard/recovery">View at-risk customers</a>
				{/if}
			</div>
		{:else}
			<div class="sequence-page__groups">
				{#each activeRows as row, index (row.id)}
					{#if shouldRenderGroupLabel(index, activeRows, activeTab)}
						<div class="sequence-page__group-label">
							<p class="section-label">
								{groupHeaderLabel(
									activeTab === 'sent'
										? row.sent_at ?? row.created_at
										: row.scheduled_for ?? row.created_at,
									activeTab
								)}
							</p>
						</div>
					{/if}

					<article class="sequence-row" class:sequence-row--failed={row.status === 'failed'}>
						<div class="timeline" aria-hidden="true">
							<div class="timeline-dot" class:timeline-dot-failed={row.status === 'failed'}></div>
							{#if index < activeRows.length - 1}
								<div class="timeline-line"></div>
							{/if}
						</div>

						<div class="sequence-row__body">
							<div class="sequence-row__layout">
								<div class="sequence-row__copy">
									<div class="sequence-row__headline">
										<p class="sequence-row__customer">
											{row.customer_name ?? 'Unnamed customer'}
										</p>
										<Badge type={row.signal_type} size="sm" />
										<span class="step-pill">Step {row.step}</span>
										{#if row.status === 'failed'}
											<span class="failed-pill">FAILED</span>
										{/if}
									</div>

									<div class="sequence-row__meta">
										<span>{row.customer_email ?? row.email_to}</span>
										<span class="sequence-row__subject">
											{truncate(row.subject_preview, 60)}
										</span>
									</div>
								</div>

								<div class="sequence-row__aside">
									<p class="sequence-row__time">
										{rightSideLabel(row, activeTab)}
									</p>

									<div class="sequence-page__row-actions">
										{#if row.status === 'pending'}
											<form method="POST" use:enhance={({ formData }) => {
												submittingEmailId = String(formData.get('emailRowId') ?? '');
												return async ({ update }) => {
													submittingEmailId = null;
													await update({ reset: false });
												};
											}}>
												<input type="hidden" name="emailRowId" value={row.id} />
												<input type="hidden" name="intent" value="send_now" />
												<button class="action-button action-button-cyan" type="submit" disabled={submittingEmailId === row.id} aria-busy={submittingEmailId === row.id}>
													{submittingEmailId === row.id ? 'Sending...' : 'Send now'}
												</button>
											</form>
											<form method="POST" use:enhance={({ formData }) => {
												submittingEmailId = String(formData.get('emailRowId') ?? '');
												return async ({ update }) => {
													submittingEmailId = null;
													await update({ reset: false });
												};
											}}>
												<input type="hidden" name="emailRowId" value={row.id} />
												<input type="hidden" name="intent" value="cancel" />
												<button class="action-button" type="submit" disabled={submittingEmailId === row.id} aria-busy={submittingEmailId === row.id}>
													{submittingEmailId === row.id ? 'Saving...' : 'Cancel'}
												</button>
											</form>
										{:else if row.status === 'failed'}
											<form method="POST" use:enhance={({ formData }) => {
												submittingEmailId = String(formData.get('emailRowId') ?? '');
												return async ({ update }) => {
													submittingEmailId = null;
													await update({ reset: false });
												};
											}}>
												<input type="hidden" name="emailRowId" value={row.id} />
												<input type="hidden" name="intent" value="retry" />
												<button class="action-button action-button-cyan" type="submit" disabled={submittingEmailId === row.id} aria-busy={submittingEmailId === row.id}>
													{submittingEmailId === row.id ? 'Retrying...' : 'Retry'}
												</button>
											</form>
										{/if}
									</div>
								</div>
							</div>

							<SequenceProgress
								emails={groupMap.get(row.signal_id) ?? []}
								signalType={row.signal_type}
							/>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</section>
