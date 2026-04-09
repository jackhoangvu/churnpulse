<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import StatusDot from '$lib/components/ui/StatusDot.svelte';
	import { SIGNAL_CONFIGS, type SignalType } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	type TabKey = 'account' | 'stripe' | 'sequences' | 'notifications';
	type Notice = {
		kind: 'success' | 'error';
		message: string;
	};
	type WebhookResult = {
		eventGenerated: string;
		signalCreated: boolean;
		sequenceScheduled: boolean;
	};

	interface Props {
		data: PageData;
		form?: ActionData;
	}

	let { data, form }: Props = $props();
	let activeTab = $state<TabKey>('account');
	let notice = $state<Notice | null>(null);
	let pendingAction = $state<string | null>(null);
	let disconnectConfirmation = $state('');
	let copiedStripeId = $state(false);
	let webhookResult = $state<WebhookResult | null>(null);
	let orgName = $state('ChurnPulse workspace');
	let orgNameForm = $state<HTMLFormElement | null>(null);
	let sequencePreferences = $state<Record<SignalType, boolean>>({
		card_failed: true,
		disengaged: true,
		downgraded: true,
		paused: true,
		cancelled: true,
		high_mrr_risk: true
	});
	let notifications = $state({
		alert_email: '',
		high_mrr_alerts_enabled: true,
		daily_digest_enabled: false
	});
	let savedSequencePreferences = $state<Record<SignalType, boolean>>({
		card_failed: true,
		disengaged: true,
		downgraded: true,
		paused: true,
		cancelled: true,
		high_mrr_risk: true
	});
	let savedNotifications = $state({
		alert_email: '',
		high_mrr_alerts_enabled: true,
		daily_digest_enabled: false
	});

	const tabs: Array<{ key: TabKey; label: string }> = [
		{ key: 'account', label: 'Account' },
		{ key: 'stripe', label: 'Stripe' },
		{ key: 'sequences', label: 'Sequences' },
		{ key: 'notifications', label: 'Notifications' }
	];

	const exactDateFormatter = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
	const connectedAtLabel = $derived(
		data.stripe.connectedAt ? exactDateFormatter.format(new Date(data.stripe.connectedAt)) : null
	);
	const sequenceDirty = $derived(
		JSON.stringify(sequencePreferences) !== JSON.stringify(savedSequencePreferences)
	);
	const notificationsDirty = $derived(
		JSON.stringify(notifications) !== JSON.stringify(savedNotifications)
	);
	const disconnectReady = $derived(disconnectConfirmation === 'disconnect');

	$effect(() => {
		orgName = data.org?.name ?? 'ChurnPulse workspace';
		sequencePreferences = { ...data.sequencePreferences };
		notifications = { ...data.notifications };
		savedSequencePreferences = { ...data.sequencePreferences };
		savedNotifications = { ...data.notifications };
		webhookResult =
			form && 'webhookResult' in form && form.webhookResult ? form.webhookResult : webhookResult;

		if (form?.message) {
			notice = { kind: 'success', message: form.message };
		}
	});

	function truncateMiddle(value: string | null, leading = 10, trailing = 6): string {
		if (!value) {
			return 'Unavailable';
		}

		if (value.length <= leading + trailing + 1) {
			return value;
		}

		return `${value.slice(0, leading)}…${value.slice(-trailing)}`;
	}

	function setNotice(kind: Notice['kind'], message: string): void {
		notice = { kind, message };
	}

	function buildEnhanceHandler(
		actionName: string,
		onSuccess?: (resultData: Record<string, unknown>) => void
	): SubmitFunction<Record<string, unknown>, Record<string, unknown>> {
		return () => {
			pendingAction = actionName;

			return async ({
				result
			}: {
				result: ActionResult<Record<string, unknown>, Record<string, unknown>>;
			}) => {
				pendingAction = null;

				if (result.type === 'failure') {
					const message =
						result.data && typeof result.data.message === 'string'
							? result.data.message
							: 'The requested change could not be saved.';
					setNotice('error', message);
					return;
				}

				if (result.type === 'success' && result.data) {
					if (typeof result.data.message === 'string') {
						setNotice('success', result.data.message);
					}

					onSuccess?.(result.data);
				}

				await applyAction(result);
			};
		};
	}

	function copyStripeAccountId(): void {
		if (!data.stripe.accountId) {
			return;
		}

		void navigator.clipboard.writeText(data.stripe.accountId).then(() => {
			copiedStripeId = true;
			window.setTimeout(() => {
				copiedStripeId = false;
			}, 1200);
		});
	}

	function handleOrgNameBlur(): void {
		if (!orgNameForm || !data.org) {
			return;
		}

		if (orgName.trim() === data.org.name) {
			return;
		}

		orgNameForm.requestSubmit();
	}

	function toggleSequence(type: SignalType): void {
		sequencePreferences = {
			...sequencePreferences,
			[type]: !sequencePreferences[type]
		};
	}

	function toggleNotification(key: 'high_mrr_alerts_enabled' | 'daily_digest_enabled'): void {
		notifications = {
			...notifications,
			[key]: !notifications[key]
		};
	}
</script>

<svelte:head>
	<title>Settings | ChurnPulse</title>
	<meta
		name="description"
		content="Configure workspace settings, Stripe connection controls, sequence preferences, and internal notifications inside ChurnPulse."
	/>
</svelte:head>

<section class="settings-page">
	<div class="settings-header">
		<div>
			<p class="section-kicker">Workspace Controls</p>
			<h1 class="settings-title">Settings</h1>
		</div>
	</div>

	{#if notice}
		<div class={`notice notice-${notice.kind}`}>
			<p>{notice.message}</p>
		</div>
	{/if}

	<div class="settings-shell">
		<nav class="tabs" aria-label="Settings">
			{#each tabs as tab (tab.key)}
				<button
					class="tab-button"
					class:tab-button-active={activeTab === tab.key}
					type="button"
					onclick={() => {
						activeTab = tab.key;
					}}
				>
					{tab.label}
				</button>
			{/each}
		</nav>

		<div class="tab-panel">
			{#if activeTab === 'account'}
				<section class="panel-section">
					<div class="section-header">
						<div>
							<p class="section-label">Account</p>
							<h2 class="section-title">Workspace profile</h2>
						</div>
						<span class="plan-badge">Beta</span>
					</div>

					<form
						class="field-stack"
						method="POST"
						action="?/updateOrgName"
						use:enhance={buildEnhanceHandler('updateOrgName')}
						bind:this={orgNameForm}
					>
						<label class="field">
							<span class="field-label">Organization name</span>
							<input
								class="text-input"
								name="orgName"
								type="text"
								bind:value={orgName}
								onblur={handleOrgNameBlur}
							/>
						</label>
						<button class="sr-only" type="submit">Save workspace name</button>
					</form>

					<div class="placeholder-card">
						<div class="placeholder-header">
							<div>
								<p class="section-label">Upgrade to paid</p>
								<h3 class="placeholder-title">$49/mo</h3>
							</div>
							<span class="placeholder-status">Coming Soon</span>
						</div>
						<ul class="feature-list">
							<li>Priority churn recovery support</li>
							<li>Higher scheduled email throughput</li>
							<li>Advanced retention reporting exports</li>
						</ul>
					</div>
				</section>
			{:else if activeTab === 'stripe'}
				<section class="panel-section">
					<div class="section-header">
						<div>
							<p class="section-label">Stripe</p>
							<h2 class="section-title">Connection health</h2>
						</div>
					</div>

					{#if data.stripe.connected}
						<div class="stripe-card">
							<div class="stripe-status">
								<div class="stripe-status-copy">
									<div class="stripe-status-line">
										<StatusDot status="recovered" />
										<span class="stripe-status-text">Connected</span>
									</div>
									<div class="stripe-account">
										<span>{truncateMiddle(data.stripe.accountId)}</span>
										<button class="copy-button" type="button" onclick={copyStripeAccountId}>
											{copiedStripeId ? 'Copied' : 'Copy'}
										</button>
									</div>
									{#if connectedAtLabel}
										<p class="stripe-muted">Connected on {connectedAtLabel}</p>
									{/if}
								</div>
							</div>

							<form
								class="inline-form"
								method="POST"
								action="?/testWebhook"
								use:enhance={buildEnhanceHandler('testWebhook', (resultData) => {
									const candidate = resultData.webhookResult;
									if (
										candidate &&
										typeof candidate === 'object' &&
										'eventGenerated' in candidate &&
										'signalCreated' in candidate &&
										'sequenceScheduled' in candidate
									) {
										webhookResult = candidate as WebhookResult;
									}
								})}
							>
								<button class="action-button action-button-cyan" type="submit">
									Test webhook
								</button>
							</form>

							{#if webhookResult}
								<div class="webhook-result">
									<p>Event: {webhookResult.eventGenerated}</p>
									<p>Signal created: {webhookResult.signalCreated ? 'Yes' : 'No'}</p>
									<p>Sequence scheduled: {webhookResult.sequenceScheduled ? 'Yes' : 'No'}</p>
								</div>
							{/if}

							<div class="danger-zone">
								<div class="danger-copy">
									<p class="section-label">Disconnect Stripe</p>
									<p class="danger-text">
										Type <span class="danger-inline">disconnect</span> to revoke OAuth access and clear saved Stripe connection data from this workspace.
									</p>
								</div>

								<form
									class="disconnect-form"
									method="POST"
									action="?/disconnectStripe"
									use:enhance={buildEnhanceHandler('disconnectStripe')}
								>
									<input
										class="text-input"
										name="confirmation"
										type="text"
										placeholder="disconnect"
										bind:value={disconnectConfirmation}
									/>
									{#if disconnectReady}
										<p class="danger-warning">This will stop Stripe signal ingestion immediately.</p>
									{/if}
									<button
										class="action-button action-button-danger"
										type="submit"
										disabled={!disconnectReady}
									>
										Disconnect Stripe
									</button>
								</form>
							</div>
						</div>
					{:else}
						<div class="compact-connect-card">
							<div class="compact-connect-copy">
								<p class="section-label">Stripe connection</p>
								<h3 class="section-title">Connect Stripe to unlock live churn monitoring</h3>
								<p class="stripe-muted">
									Read-only OAuth access only. ChurnPulse starts classifying at-risk customers as soon as the webhook connection is active.
								</p>
							</div>
							<a class="action-button action-button-cyan" href="/api/stripe/connect">
								Connect Stripe
							</a>
						</div>
					{/if}
				</section>
			{:else if activeTab === 'sequences'}
				<section class="panel-section">
					<div class="section-header">
						<div>
							<p class="section-label">Sequences</p>
							<h2 class="section-title">Signal-to-sequence coverage</h2>
						</div>
						{#if sequenceDirty}
							<span class="unsaved-indicator">Unsaved</span>
						{/if}
					</div>

					<form
						class="preferences-form"
						method="POST"
						action="?/updateSequencePreferences"
						use:enhance={buildEnhanceHandler('updateSequencePreferences', () => {
							savedSequencePreferences = { ...sequencePreferences };
						})}
					>
						<input type="hidden" name="preferences" value={JSON.stringify(sequencePreferences)} />

						<div class="toggle-list">
							{#each data.sequenceSteps as item (item.type)}
								<div class="toggle-row">
									<div class="toggle-copy">
										<p class="toggle-title">{SIGNAL_CONFIGS[item.type].label}</p>
										<p class="toggle-description">{item.description}</p>
									</div>
									<button
										class="toggle"
										class:toggle-active={sequencePreferences[item.type]}
										type="button"
										role="switch"
										aria-checked={sequencePreferences[item.type]}
										aria-label={`Toggle ${SIGNAL_CONFIGS[item.type].label} sequence`}
										onclick={() => {
											toggleSequence(item.type);
										}}
									>
										<span class="toggle-thumb"></span>
									</button>
								</div>
							{/each}
						</div>

						<div class="info-box">
							<p>All sequences use AI-generated personalization before send.</p>
						</div>

						<div class="save-row">
							<button
								class="action-button"
								class:action-button-unsaved={sequenceDirty}
								class:action-button-muted={!sequenceDirty}
								type="submit"
								disabled={!sequenceDirty}
							>
								Save sequence settings
							</button>
						</div>
					</form>
				</section>
			{:else}
				<section class="panel-section">
					<div class="section-header">
						<div>
							<p class="section-label">Notifications</p>
							<h2 class="section-title">Internal alert routing</h2>
						</div>
						{#if notificationsDirty}
							<span class="unsaved-indicator">Unsaved</span>
						{/if}
					</div>

					<form
						class="field-stack"
						method="POST"
						action="?/updateNotificationPreferences"
						use:enhance={buildEnhanceHandler('updateNotificationPreferences', () => {
							savedNotifications = { ...notifications };
						})}
					>
						<input type="hidden" name="notifications" value={JSON.stringify(notifications)} />

						<label class="field">
							<span class="field-label">Alert email address</span>
							<input
								class="text-input"
								type="email"
								bind:value={notifications.alert_email}
								oninput={(event) => {
									notifications = {
										...notifications,
										alert_email: (event.currentTarget as HTMLInputElement).value
									};
								}}
							/>
						</label>

						<div class="toggle-row">
							<div class="toggle-copy">
								<p class="toggle-title">Email me when High MRR customer detected</p>
								<p class="toggle-description">Enabled by default for immediate internal escalation.</p>
							</div>
							<button
								class="toggle"
								class:toggle-active={notifications.high_mrr_alerts_enabled}
								type="button"
								role="switch"
								aria-checked={notifications.high_mrr_alerts_enabled}
								aria-label="Toggle High MRR customer alerts"
								onclick={() => {
									toggleNotification('high_mrr_alerts_enabled');
								}}
							>
								<span class="toggle-thumb"></span>
							</button>
						</div>

						<div class="toggle-row">
							<div class="toggle-copy">
								<p class="toggle-title">Daily digest of signals</p>
								<p class="toggle-description">Sends a morning summary of yesterday’s churn signals.</p>
							</div>
							<button
								class="toggle"
								class:toggle-active={notifications.daily_digest_enabled}
								type="button"
								role="switch"
								aria-checked={notifications.daily_digest_enabled}
								aria-label="Toggle daily digest notifications"
								onclick={() => {
									toggleNotification('daily_digest_enabled');
								}}
							>
								<span class="toggle-thumb"></span>
							</button>
						</div>

						<div class="save-row">
							<button
								class="action-button"
								class:action-button-unsaved={notificationsDirty}
								class:action-button-muted={!notificationsDirty}
								type="submit"
								disabled={!notificationsDirty}
							>
								Save notification settings
							</button>
						</div>
					</form>
				</section>
			{/if}
		</div>
	</div>
</section>

<style>
	.settings-page {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.5rem;
	}

	.settings-header,
	.settings-shell,
	.panel-section,
	.placeholder-card,
	.stripe-card,
	.compact-connect-card,
	.info-box,
	.notice {
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: var(--bg-surface);
	}

	.section-kicker,
	.section-label,
	.plan-badge,
	.placeholder-status,
	.unsaved-indicator {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.68rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.section-kicker,
	.section-label {
		color: var(--text-muted);
	}

	.settings-title,
	.section-title {
		margin: 0.35rem 0 0;
		font-family: 'IBM Plex Mono', monospace;
		font-weight: 500;
		color: var(--text-primary);
	}

	.settings-title {
		font-size: 1.5rem;
	}

	.section-title {
		font-size: 1.15rem;
	}

	.notice {
		padding: 0.9rem 1rem;
	}

	.notice p {
		margin: 0;
		font-size: 0.86rem;
	}

	.notice-success {
		border-left: 3px solid var(--status-success);
	}

	.notice-error {
		border-left: 3px solid var(--status-danger);
	}

	.settings-shell {
		display: grid;
		grid-template-columns: 13rem minmax(0, 1fr);
	}

	.tabs {
		display: flex;
		flex-direction: column;
		border-right: 1px solid rgba(255, 255, 255, 0.08);
		background: var(--bg-elevated);
	}

	.tab-button {
		padding: 1rem 1.1rem;
		border-left: 2px solid transparent;
		color: var(--text-secondary);
		text-align: left;
		transition:
			border-color 140ms ease,
			background-color 140ms ease,
			color 140ms ease;
	}

	.tab-button:hover {
		background: rgba(255, 255, 255, 0.03);
		color: var(--text-primary);
	}

	.tab-button-active {
		border-left-color: var(--accent-cyan);
		background: rgba(0, 229, 255, 0.08);
		color: var(--text-primary);
	}

	.tab-panel {
		padding: 1.25rem;
	}

	.panel-section {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.25rem;
	}

	.section-header,
	.placeholder-header,
	.toggle-row,
	.compact-connect-card,
	.save-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.field-stack,
	.preferences-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.field {
		display: grid;
		gap: 0.5rem;
	}

	.field-label,
	.stripe-muted,
	.toggle-description,
	.danger-text {
		font-size: 0.82rem;
		color: var(--text-secondary);
	}

	.text-input {
		width: 100%;
		padding: 0.8rem 0.9rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: var(--bg-base);
		color: var(--text-primary);
	}

	.text-input:focus {
		outline: none;
		border-color: var(--accent-cyan);
		box-shadow: 0 0 0 1px rgba(0, 229, 255, 0.24);
	}

	.plan-badge,
	.placeholder-status,
	.unsaved-indicator {
		padding: 0.35rem 0.55rem;
		border: 1px solid rgba(0, 229, 255, 0.22);
		background: rgba(0, 229, 255, 0.08);
		color: var(--accent-cyan);
	}

	.placeholder-card,
	.webhook-result,
	.info-box,
	.danger-zone,
	.compact-connect-card {
		padding: 1rem;
	}

	.placeholder-title {
		margin: 0.35rem 0 0;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1.4rem;
		color: var(--text-primary);
	}

	.feature-list {
		display: grid;
		gap: 0.6rem;
		margin: 1rem 0 0;
		padding: 0 0 0 1rem;
		color: var(--text-secondary);
	}

	.stripe-card {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.1rem;
	}

	.stripe-status-line,
	.stripe-account,
	.inline-form {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
	}

	.stripe-status-text,
	.stripe-account,
	.toggle-title {
		font-size: 0.92rem;
		color: var(--text-primary);
	}

	.stripe-account {
		margin-top: 0.45rem;
		font-family: 'IBM Plex Mono', monospace;
	}

	.copy-button {
		padding: 0.3rem 0.45rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		font-size: 0.72rem;
		color: var(--text-secondary);
	}

	.action-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.75rem;
		padding: 0.7rem 1rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		transition:
			border-color 140ms ease,
			background-color 140ms ease,
			color 140ms ease,
			opacity 140ms ease;
	}

	.action-button:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.action-button-cyan {
		border-color: rgba(0, 229, 255, 0.2);
		background: rgba(0, 229, 255, 0.08);
		color: var(--accent-cyan);
	}

	.action-button-danger {
		border-color: rgba(255, 68, 89, 0.28);
		color: var(--status-danger);
	}

	.action-button-muted {
		color: var(--text-secondary);
	}

	.action-button-unsaved {
		border-color: rgba(255, 184, 0, 0.34);
		background: rgba(255, 184, 0, 0.08);
		color: var(--status-warning);
	}

	.webhook-result p,
	.info-box p,
	.danger-warning {
		margin: 0;
		font-size: 0.82rem;
		color: var(--text-primary);
	}

	.webhook-result {
		display: grid;
		gap: 0.35rem;
	}

	.danger-zone {
		display: grid;
		gap: 1rem;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
	}

	.danger-inline {
		font-family: 'IBM Plex Mono', monospace;
		color: var(--status-danger);
	}

	.disconnect-form {
		display: grid;
		gap: 0.75rem;
	}

	.danger-warning {
		color: var(--status-danger);
	}

	.toggle-list {
		display: grid;
		gap: 0.95rem;
	}

	.toggle-copy {
		flex: 1;
	}

	.toggle-title {
		margin: 0;
	}

	.toggle-description {
		margin: 0.3rem 0 0;
	}

	.toggle {
		position: relative;
		width: 2.5rem;
		height: 1.5rem;
		border: 1px solid transparent;
		background: rgba(255, 255, 255, 0.08);
		transition: background-color 160ms ease;
	}

	.toggle-thumb {
		position: absolute;
		top: 0.125rem;
		left: 0.125rem;
		width: 1rem;
		height: 1rem;
		background: var(--text-muted);
		transition:
			transform 160ms ease,
			background-color 160ms ease;
	}

	.toggle-active {
		background: rgba(0, 229, 255, 0.2);
	}

	.toggle-active .toggle-thumb {
		transform: translateX(1rem);
		background: var(--accent-cyan);
	}

	.info-box {
		border-color: rgba(0, 229, 255, 0.16);
		background: rgba(0, 229, 255, 0.05);
	}

	.compact-connect-card {
		align-items: flex-start;
	}

	.compact-connect-copy {
		max-width: 34rem;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@media (max-width: 960px) {
		.settings-shell {
			grid-template-columns: 1fr;
		}

		.tabs {
			flex-direction: row;
			overflow-x: auto;
			border-right: 0;
			border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		}

		.tab-button {
			min-width: 9rem;
			border-left: 0;
			border-bottom: 2px solid transparent;
		}

		.tab-button-active {
			border-bottom-color: var(--accent-cyan);
		}

		.section-header,
		.placeholder-header,
		.toggle-row,
		.compact-connect-card,
		.save-row {
			flex-direction: column;
			align-items: flex-start;
		}
	}
</style>
