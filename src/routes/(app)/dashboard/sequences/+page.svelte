<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import SequenceProgress from '$lib/components/dashboard/SequenceProgress.svelte';
	import type { SignalType } from '$lib/types';

	type TabKey = 'pending' | 'sent' | 'failed';

	let { data, form } = $props();

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

			return diffDays <= 1 ? 'Sent yesterday' : `Sent ${diffDays} days ago`;
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
</script>

<svelte:head>
	<title>Sequences | ChurnPulse</title>
	<meta
		name="description"
		content="Monitor scheduled churn-prevention emails, delivery failures, and sequence progress across your ChurnPulse workspace."
	/>
</svelte:head>

<section class="space-y-6 px-6 py-6 md:px-8">
	<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
		<div class="space-y-3">
			<p class="font-mono text-xs uppercase tracking-[0.22em] text-[var(--accent-cyan)]">
				Retention sequences
			</p>
			<div>
				<h2 class="font-mono text-3xl uppercase tracking-[0.06em] text-white">
					Queue, review, and rescue revenue on schedule.
				</h2>
				<p class="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
					Every scheduled email is organized by customer, signal, and sequence step so your
					operators can intervene before a recovery path stalls.
				</p>
			</div>
		</div>

		<div class="flex items-center gap-3">
			<a
				class="border border-[var(--border-default)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:border-[var(--border-accent)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
				href="/dashboard/sequences/templates"
			>
				View templates
			</a>
		</div>
	</div>

	{#if form?.message}
		<div class="border border-[var(--border-accent)] bg-[var(--accent-cyan-dim)] px-4 py-3 text-sm text-[var(--accent-cyan)]">
			{form.message}
		</div>
	{/if}

	<div class="grid gap-4 xl:grid-cols-3">
		<article class="border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
			<p class="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
				Emails Sent Today
			</p>
			<p class="mt-4 font-mono text-4xl text-white">{data.stats.sentToday}</p>
			<p class="mt-3 text-sm text-[var(--text-secondary)]">
				{data.stats.sentThisWeek} delivered so far this week.
			</p>
		</article>

		<article class="border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
			<p class="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
				Scheduled This Week
			</p>
			<p class="mt-4 font-mono text-4xl text-white">{data.stats.scheduledThisWeek}</p>
			<p class="mt-3 text-sm text-[var(--text-secondary)]">
				{data.stats.totalPending} pending across all active sequences.
			</p>
		</article>

		<article class="border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
			<p class="font-mono text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
				Failed (needs attention)
			</p>
			<p
				class="mt-4 font-mono text-4xl"
				class:text-[var(--status-danger)]={data.stats.failed > 0}
				class:text-white={data.stats.failed === 0}
			>
				{data.stats.failed}
			</p>
			<p class="mt-3 text-sm text-[var(--text-secondary)]">
				Workspace success rate: {data.stats.successRate}%.
			</p>
		</article>
	</div>

	<div class="flex flex-col gap-4 border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
		<div class="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
			<div class="flex flex-wrap items-center gap-3">
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

			<div class="flex items-center gap-3 text-xs text-[var(--text-muted)]">
				<span class="font-mono uppercase tracking-[0.18em]">{data.orgName}</span>
				<span class="hidden md:inline">Live success rate: {data.stats.successRate}%</span>
			</div>
		</div>

		<form class="grid gap-3 lg:grid-cols-[180px_180px_160px_160px_auto_auto]" method="GET">
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

			<button class="filter-button filter-button-primary" type="submit">Apply filters</button>
			<a class="filter-button" href={buildUrl(activeTab)}>Reset range</a>
		</form>
	</div>

	<section class="border border-[var(--border-default)] bg-[var(--bg-surface)]">
		{#if activeRows.length === 0}
			<div class="flex min-h-[320px] flex-col items-center justify-center px-6 py-10 text-center">
				<p class="font-mono text-xs uppercase tracking-[0.22em] text-[var(--accent-cyan)]">
					{emptyState.title}
				</p>
				<p class="mt-4 max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
					{emptyState.description}
				</p>
			</div>
		{:else}
			<div class="divide-y divide-[var(--border-subtle)]">
				{#each activeRows as row, index (row.id)}
					{#if shouldRenderGroupLabel(index, activeRows, activeTab)}
						<div class="px-5 pt-5">
							<p class="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--text-muted)]">
								{groupHeaderLabel(
									activeTab === 'sent'
										? row.sent_at ?? row.created_at
										: row.scheduled_for ?? row.created_at,
									activeTab
								)}
							</p>
						</div>
					{/if}

					<article class="sequence-row" class:sequence-row-failed={row.status === 'failed'}>
						<div class="timeline" aria-hidden="true">
							<div class="timeline-dot" class:timeline-dot-failed={row.status === 'failed'}></div>
							{#if index < activeRows.length - 1}
								<div class="timeline-line"></div>
							{/if}
						</div>

						<div class="min-w-0 space-y-4">
							<div class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px] xl:items-start">
								<div class="min-w-0 space-y-3">
									<div class="flex flex-wrap items-center gap-3">
										<p class="text-sm font-semibold text-white">
											{row.customer_name ?? 'Unnamed customer'}
										</p>
										<Badge type={row.signal_type} size="sm" />
										<span class="step-pill">Step {row.step}</span>
										{#if row.status === 'failed'}
											<span class="failed-pill">FAILED</span>
										{/if}
									</div>

									<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--text-secondary)]">
										<span>{row.customer_email ?? row.email_to}</span>
										<span class="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
											{truncate(row.subject_preview, 60)}
										</span>
									</div>
								</div>

								<div class="flex flex-col items-start gap-3 xl:items-end">
									<p class="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
										{rightSideLabel(row, activeTab)}
									</p>

									<div class="flex flex-wrap items-center gap-2">
										{#if row.status === 'pending'}
											<form method="POST">
												<input type="hidden" name="emailRowId" value={row.id} />
												<input type="hidden" name="intent" value="send_now" />
												<button class="action-button action-button-cyan" type="submit">
													Send now
												</button>
											</form>
											<form method="POST">
												<input type="hidden" name="emailRowId" value={row.id} />
												<input type="hidden" name="intent" value="cancel" />
												<button class="action-button" type="submit">Cancel</button>
											</form>
										{:else if row.status === 'failed'}
											<form method="POST">
												<input type="hidden" name="emailRowId" value={row.id} />
												<input type="hidden" name="intent" value="retry" />
												<button class="action-button action-button-cyan" type="submit">
													Retry
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

<style>
	.tab {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 0.9rem;
		border: 1px solid var(--border-default);
		background: transparent;
		color: var(--text-secondary);
		transition:
			border-color 160ms ease,
			background-color 160ms ease,
			color 160ms ease;
	}

	.tab:hover {
		border-color: var(--border-accent);
		background: var(--bg-elevated);
		color: var(--text-primary);
	}

	.tab-active {
		border-color: var(--accent-cyan);
		background: rgba(0, 229, 255, 0.08);
		color: white;
	}

	.tab-count {
		padding: 0.12rem 0.38rem;
		border: 1px solid var(--border-default);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		color: var(--text-muted);
	}

	.filter-field {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.filter-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.filter-input {
		min-height: 42px;
		border: 1px solid var(--border-default);
		background: var(--bg-elevated);
		padding: 0 0.85rem;
		color: var(--text-primary);
	}

	.filter-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 42px;
		align-self: end;
		border: 1px solid var(--border-default);
		padding: 0 1rem;
		color: var(--text-secondary);
		transition:
			border-color 160ms ease,
			background-color 160ms ease,
			color 160ms ease;
	}

	.filter-button:hover {
		border-color: var(--border-accent);
		background: var(--bg-elevated);
		color: var(--text-primary);
	}

	.filter-button-primary {
		border-color: var(--accent-cyan-border);
		background: var(--accent-cyan-dim);
		color: var(--accent-cyan);
	}

	.sequence-row {
		display: grid;
		grid-template-columns: 18px minmax(0, 1fr);
		gap: 1rem;
		padding: 1.15rem 1.25rem 1.25rem;
	}

	.sequence-row-failed {
		border-left: 3px solid var(--status-danger);
		background: linear-gradient(90deg, rgba(255, 68, 89, 0.08), transparent 22%);
	}

	.timeline {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding-top: 0.25rem;
	}

	.timeline-dot {
		width: 0.65rem;
		height: 0.65rem;
		border-radius: 999px;
		background: var(--accent-cyan);
		box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.08);
	}

	.timeline-dot-failed {
		background: var(--status-danger);
		box-shadow: 0 0 0 3px rgba(255, 68, 89, 0.08);
	}

	.timeline-line {
		width: 1px;
		flex: 1;
		margin-top: 0.55rem;
		background: rgba(255, 255, 255, 0.12);
	}

	.step-pill,
	.failed-pill {
		display: inline-flex;
		align-items: center;
		padding: 0.3rem 0.5rem;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.step-pill {
		border: 1px solid var(--border-default);
		color: var(--text-muted);
	}

	.failed-pill {
		border: 1px solid rgba(255, 68, 89, 0.28);
		background: rgba(255, 68, 89, 0.12);
		color: var(--status-danger);
	}

	.action-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 30px;
		border: 1px solid var(--border-default);
		padding: 0 0.75rem;
		font-size: 12px;
		color: var(--text-secondary);
		background: transparent;
		transition:
			border-color 160ms ease,
			background-color 160ms ease,
			color 160ms ease;
	}

	.action-button:hover {
		border-color: var(--border-accent);
		background: var(--bg-elevated);
		color: var(--text-primary);
	}

	.action-button-cyan {
		border-color: var(--accent-cyan-border);
		color: var(--accent-cyan);
	}
</style>
