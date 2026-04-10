<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import StatusDot from '$lib/components/ui/StatusDot.svelte';
	import { PROVIDER_META, SIGNAL_CONFIGS, type SignalType } from '$lib/types';
	import type { ActionData, PageData } from './$types';

	type TabKey = 'account' | 'polar' | 'integrations' | 'sequences' | 'notifications';
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
	let copiedPolarId = $state(false);
	let webhookResult = $state<WebhookResult | null>(null);
	let orgName = $state('ChurnPulse workspace');
	let orgNameForm = $state<HTMLFormElement | null>(null);
	let sequencePreferences = $state<Record<SignalType, boolean>>({
		card_failed: true,
		disengaged: true,
		downgraded: true,
		paused: true,
		cancelled: true,
		high_mrr_risk: true,
		trial_ending: true
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
		high_mrr_risk: true,
		trial_ending: true
	});
	let savedNotifications = $state({
		alert_email: '',
		high_mrr_alerts_enabled: true,
		daily_digest_enabled: false
	});

	const tabs: Array<{ key: TabKey; label: string }> = [
		{ key: 'account', label: 'Account' },
		{ key: 'polar', label: 'Polar' },
		{ key: 'integrations', label: 'Integrations' },
		{ key: 'sequences', label: 'Sequences' },
		{ key: 'notifications', label: 'Notifications' }
	];

	const exactDateFormatter = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});

	const connectedAtLabel = $derived(
		data.polar.connectedAt ? exactDateFormatter.format(new Date(data.polar.connectedAt)) : null
	);
	const sequenceDirty = $derived(
		JSON.stringify(sequencePreferences) !== JSON.stringify(savedSequencePreferences)
	);
	const notificationsDirty = $derived(
		JSON.stringify(notifications) !== JSON.stringify(savedNotifications)
	);
	const disconnectReady = $derived(disconnectConfirmation === 'disconnect');
	const stripeConnected = $derived(data.integrations.stripe.connected);
	const stripeAccountId = $derived(data.integrations.stripe.accountId ?? 'Unavailable');
	const paddleConnected = $derived(data.integrations.paddle.connected);
	const lsConnected = $derived(data.integrations.lemonsqueezy.connected);

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

	function copyPolarOrganizationId(): void {
		if (!data.polar.organizationId) {
			return;
		}

		void navigator.clipboard.writeText(data.polar.organizationId).then(() => {
			copiedPolarId = true;
			window.setTimeout(() => {
				copiedPolarId = false;
			}, 1200);
		});
	}

	function copyToClipboard(value: string): void {
		void navigator.clipboard.writeText(value).then(() => {
			setNotice('success', 'Copied to clipboard.');
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
		content="Configure workspace settings, billing integrations, sequence preferences, and internal notifications inside ChurnPulse."
	/>
</svelte:head>

<section class="settings-page" id="settings-page">
	<div class="settings-header" id="settings-header">
		<div class="settings-header__copy" id="settings-header-copy">
			<p class="section-kicker" id="settings-kicker">Workspace Controls</p>
			<h1 class="settings-title" id="settings-title">Settings</h1>
		</div>
	</div>

	{#if notice}
		<div class={`notice notice-${notice.kind}`} id="settings-notice">
			<p class="notice__message" id="settings-notice-message">{notice.message}</p>
		</div>
	{/if}

	<div class="settings-shell" id="settings-shell">
		<nav class="tabs" aria-label="Settings" id="settings-tabs">
			{#each tabs as tab (tab.key)}
				<button
					class="tab-button"
					class:tab-button-active={activeTab === tab.key}
					type="button"
					id={`settings-tab-${tab.key}`}
					onclick={() => {
						activeTab = tab.key;
					}}
				>
					{tab.label}
				</button>
			{/each}
		</nav>

		<div class="tab-panel" id="settings-tab-panel">
			{#if activeTab === 'account'}
				<section class="panel-section" id="account-panel">
					<div class="section-header" id="account-header">
						<div class="section-header__copy" id="account-header-copy">
							<p class="section-label" id="account-label">Account</p>
							<h2 class="section-title" id="account-title">Workspace profile</h2>
						</div>
						<span class="plan-badge" id="account-plan-badge">Beta</span>
					</div>

					<form
						class="field-stack"
						method="POST"
						action="?/updateOrgName"
						use:enhance={buildEnhanceHandler('updateOrgName')}
						bind:this={orgNameForm}
						id="account-name-form"
					>
						<label class="field" id="account-name-field">
							<span class="field-label" id="account-name-label">Organization name</span>
							<input
								class="text-input"
								name="orgName"
								type="text"
								bind:value={orgName}
								id="account-name-input"
								onblur={handleOrgNameBlur}
							/>
						</label>
						<button class="sr-only" type="submit" id="account-name-submit">
							Save workspace name
						</button>
					</form>

					<div class="placeholder-card" id="account-upgrade-card">
						<div class="placeholder-header" id="account-upgrade-header">
							<div class="placeholder-copy" id="account-upgrade-copy">
								<p class="section-label" id="account-upgrade-label">Upgrade to paid</p>
								<h3 class="placeholder-title" id="account-upgrade-title">$49/mo</h3>
							</div>
							<span class="placeholder-status" id="account-upgrade-status">Coming Soon</span>
						</div>
						<ul class="feature-list" id="account-upgrade-features">
							<li class="feature-list__item" id="account-feature-priority">
								Priority churn recovery support
							</li>
							<li class="feature-list__item" id="account-feature-throughput">
								Higher scheduled email throughput
							</li>
							<li class="feature-list__item" id="account-feature-reporting">
								Advanced retention reporting exports
							</li>
						</ul>
					</div>
				</section>
			{:else if activeTab === 'polar'}
				<section class="panel-section" id="polar-panel">
					<div class="section-header" id="polar-header">
						<div class="section-header__copy" id="polar-header-copy">
							<p class="section-label" id="polar-label">Polar</p>
							<h2 class="section-title" id="polar-title">Connection health</h2>
						</div>
					</div>

					{#if data.polar.connected}
						<div class="polar-card" id="polar-card">
							<div class="polar-status" id="polar-status-block">
								<div class="polar-status-copy" id="polar-status-copy">
									<div class="polar-status-line" id="polar-status-line">
										<StatusDot status="recovered" />
										<span class="polar-status-text" id="polar-status-text">Connected</span>
									</div>
									<div class="polar-account" id="polar-account">
										<span class="settings-account font-mono" id="polar-account-value">
											{truncateMiddle(data.polar.organizationId)}
										</span>
										<button class="copy-button" type="button" id="polar-copy-button" onclick={copyPolarOrganizationId}>
											{copiedPolarId ? 'Copied' : 'Copy'}
										</button>
									</div>
									{#if connectedAtLabel}
										<p class="polar-muted" id="polar-connected-at">
											Connected on {connectedAtLabel}
										</p>
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
								id="polar-test-webhook-form"
							>
								<button class="action-button action-button-cyan" type="submit" id="polar-test-webhook-button">
									{pendingAction === 'testWebhook' ? 'Testing...' : 'Test webhook'}
								</button>
							</form>

							{#if webhookResult}
								<div class="webhook-result" id="polar-webhook-result">
									<p class="webhook-result__line" id="polar-webhook-event">
										Event: {webhookResult.eventGenerated}
									</p>
									<p class="webhook-result__line" id="polar-webhook-signal">
										Signal created: {webhookResult.signalCreated ? 'Yes' : 'No'}
									</p>
									<p class="webhook-result__line" id="polar-webhook-sequence">
										Sequence scheduled: {webhookResult.sequenceScheduled ? 'Yes' : 'No'}
									</p>
								</div>
							{/if}

							<div class="danger-zone" id="polar-danger-zone">
								<div class="danger-copy" id="polar-danger-copy">
									<p class="section-label" id="polar-danger-label">Disconnect Polar</p>
									<p class="danger-text" id="polar-danger-text">
										Type <span class="danger-inline" id="polar-danger-inline">disconnect</span>
										to revoke access and clear saved Polar connection data from this workspace.
									</p>
								</div>

								<form
									class="disconnect-form"
									method="POST"
									action="?/disconnectPolar"
									use:enhance={buildEnhanceHandler('disconnectPolar')}
									id="polar-disconnect-form"
								>
									<input
										class="text-input"
										name="confirmation"
										type="text"
										placeholder="disconnect"
										bind:value={disconnectConfirmation}
										id="polar-disconnect-input"
									/>
									{#if disconnectReady}
										<p class="danger-warning" id="polar-danger-warning">
											This will stop Polar signal ingestion immediately.
										</p>
									{/if}
									<button
										class="action-button action-button-danger"
										type="submit"
										disabled={!disconnectReady}
										id="polar-disconnect-button"
									>
										Disconnect Polar
									</button>
								</form>
							</div>
						</div>
					{:else}
						<div class="compact-connect-card" id="polar-connect-card">
							<div class="compact-connect-copy" id="polar-connect-copy">
								<p class="section-label" id="polar-connect-label">Polar connection</p>
								<h3 class="section-title" id="polar-connect-title">
									Connect Polar to unlock live churn monitoring
								</h3>
								<p class="polar-muted" id="polar-connect-text">
									Read-only OAuth access only. ChurnPulse starts classifying at-risk
									customers as soon as the webhook connection is active.
								</p>
							</div>
							<a class="action-button action-button-cyan" href="/api/polar/connect" id="polar-connect-link">
								Connect Polar
							</a>
						</div>
					{/if}
				</section>
			{:else if activeTab === 'integrations'}
				<section class="panel-section" id="integrations-panel">
					<div class="section-header" id="integrations-header">
						<div class="section-header__copy" id="integrations-header-copy">
							<p class="section-label" id="integrations-label">Connected billing platforms</p>
							<h2 class="section-title" id="integrations-title">Integrations</h2>
						</div>
					</div>
					<p class="polar-muted" id="integrations-intro">
						ChurnPulse monitors your customers' billing events. Connect the platforms your
						customers use. Each platform uses read-only or webhook-only access - we never
						store payment credentials.
					</p>

					<div class="integrations-grid" id="integrations-grid">
						<div class="integration-card" id="integration-polar">
							<div class="integration-card__header" id="integration-polar-header">
								<div class="integration-card__brand" id="integration-polar-brand">
									<div
										class="integration-card__dot"
										style={`--provider-color: ${PROVIDER_META.polar.color}`}
										aria-hidden="true"
										id="integration-polar-dot"
									></div>
									<h3 class="integration-card__name" id="integration-polar-name">Polar</h3>
									<span class="badge badge-brand integration-card__type-badge" id="integration-polar-type">
										OAuth
									</span>
								</div>
								{#if data.polar.connected}
									<span class="badge badge-success" id="polar-status">Connected</span>
								{:else}
									<span class="badge badge-muted" id="polar-status">Not connected</span>
								{/if}
							</div>
							<p class="integration-card__desc" id="integration-polar-desc">
								Connect your customers' Polar workspaces to detect subscription
								cancellations, payment failures, and churn signals in real time.
							</p>
							{#if data.polar.connected}
								<div class="integration-card__meta" id="polar-meta">
									<span class="settings-account font-mono" id="polar-account-id">
										{truncateMiddle(data.polar.accountId)}
									</span>
									<form method="POST" action="?/disconnectPolar" id="polar-disconnect-inline-form">
										<input type="hidden" name="confirmation" value="disconnect" id="polar-disconnect-hidden" />
										<button class="action-button action-button-danger" type="submit" id="polar-disconnect-btn">
											Disconnect
										</button>
									</form>
								</div>
							{:else}
								<a class="action-button action-button-cyan" href="/api/polar/connect" id="polar-connect-btn">
									Connect Polar -&gt;
								</a>
							{/if}
						</div>

						<div class="integration-card" id="integration-stripe">
							<div class="integration-card__header" id="integration-stripe-header">
								<div class="integration-card__brand" id="integration-stripe-brand">
									<div
										class="integration-card__dot"
										style={`--provider-color: ${PROVIDER_META.stripe.color}`}
										aria-hidden="true"
										id="integration-stripe-dot"
									></div>
									<h3 class="integration-card__name" id="integration-stripe-name">Stripe</h3>
									<span class="badge badge-brand integration-card__type-badge" id="integration-stripe-type">
										OAuth
									</span>
								</div>
								{#if stripeConnected}
									<span class="badge badge-success" id="stripe-status">Connected</span>
								{:else}
									<span class="badge badge-muted" id="stripe-status">Not connected</span>
								{/if}
							</div>
							<p class="integration-card__desc" id="integration-stripe-desc">
								Connect your customers' Stripe accounts via read-only OAuth to monitor
								card failures, plan downgrades, cancellations, and trial endings.
							</p>
							{#if !stripeConnected}
								<a class="action-button action-button-cyan" href="/api/stripe/connect" id="stripe-connect-btn">
									Connect Stripe -&gt;
								</a>
							{:else}
								<span class="settings-account font-mono" id="stripe-account-id">
									{truncateMiddle(stripeAccountId)}
								</span>
							{/if}
						</div>

						<div class="integration-card" id="integration-paddle">
							<div class="integration-card__header" id="integration-paddle-header">
								<div class="integration-card__brand" id="integration-paddle-brand">
									<div
										class="integration-card__dot"
										style={`--provider-color: ${PROVIDER_META.paddle.color}`}
										aria-hidden="true"
										id="integration-paddle-dot"
									></div>
									<h3 class="integration-card__name" id="integration-paddle-name">Paddle</h3>
									<span class="badge badge-muted integration-card__type-badge" id="integration-paddle-type">
										Webhook
									</span>
								</div>
								{#if paddleConnected}
									<span class="badge badge-success" id="paddle-status">Connected</span>
								{:else}
									<span class="badge badge-muted" id="paddle-status">Not connected</span>
								{/if}
							</div>
							<p class="integration-card__desc" id="integration-paddle-desc">
								Point your Paddle webhook at ChurnPulse to detect subscription events.
								Paste your Paddle webhook signing secret below.
							</p>
							<div class="integration-card__setup" id="paddle-setup">
								<div class="integration-card__endpoint-row" id="paddle-endpoint-row">
									<span class="docs-code font-mono" id="paddle-endpoint-url">
										{data.appUrl}/api/webhooks/paddle
									</span>
									<button
										class="copy-button"
										type="button"
										id="paddle-copy-endpoint-btn"
										onclick={() => copyToClipboard(`${data.appUrl}/api/webhooks/paddle`)}
									>
										Copy URL
									</button>
								</div>
								<form
									method="POST"
									action="?/savePaddleSecret"
									class="integration-card__secret-form"
									id="paddle-secret-form"
									use:enhance={buildEnhanceHandler('savePaddleSecret')}
								>
									<label class="field" for="paddle-secret-input" id="paddle-secret-field">
										<span class="field-label" id="paddle-secret-label">
											Paddle webhook signing secret
										</span>
									</label>
									<input
										class="text-input"
										id="paddle-secret-input"
										name="secret"
										type="password"
										placeholder="pdl_ntfset_..."
										autocomplete="off"
									/>
									<button class="action-button action-button-cyan" type="submit" id="paddle-save-btn">
										Save secret
									</button>
								</form>
							</div>
						</div>

						<div class="integration-card" id="integration-lemonsqueezy">
							<div class="integration-card__header" id="integration-ls-header">
								<div class="integration-card__brand" id="integration-ls-brand">
									<div
										class="integration-card__dot"
										style={`--provider-color: ${PROVIDER_META.lemonsqueezy.color}`}
										aria-hidden="true"
										id="integration-ls-dot"
									></div>
									<h3 class="integration-card__name" id="integration-ls-name">
										Lemon Squeezy
									</h3>
									<span class="badge badge-muted integration-card__type-badge" id="integration-ls-type">
										Webhook
									</span>
								</div>
								{#if lsConnected}
									<span class="badge badge-success" id="ls-status">Connected</span>
								{:else}
									<span class="badge badge-muted" id="ls-status">Not connected</span>
								{/if}
							</div>
							<p class="integration-card__desc" id="integration-ls-desc">
								Point your Lemon Squeezy webhook at ChurnPulse and add your signing
								secret. Supports subscription cancellation, payment failures, and paused
								plans.
							</p>
							<div class="integration-card__setup" id="ls-setup">
								<div class="integration-card__endpoint-row" id="ls-endpoint-row">
									<span class="docs-code font-mono" id="ls-endpoint-url">
										{data.appUrl}/api/webhooks/lemonsqueezy
									</span>
									<button
										class="copy-button"
										type="button"
										id="ls-copy-endpoint-btn"
										onclick={() => copyToClipboard(`${data.appUrl}/api/webhooks/lemonsqueezy`)}
									>
										Copy URL
									</button>
								</div>
								<form
									method="POST"
									action="?/saveLemonSqueezySecret"
									class="integration-card__secret-form"
									id="ls-secret-form"
									use:enhance={buildEnhanceHandler('saveLemonSqueezySecret')}
								>
									<label class="field" for="ls-secret-input" id="ls-secret-field">
										<span class="field-label" id="ls-secret-label">
											Lemon Squeezy signing secret
										</span>
									</label>
									<input
										class="text-input"
										id="ls-secret-input"
										name="secret"
										type="password"
										placeholder="Your LS signing secret"
										autocomplete="off"
									/>
									<button class="action-button action-button-cyan" type="submit" id="ls-save-btn">
										Save secret
									</button>
								</form>
							</div>
						</div>
					</div>

					<div class="info-box" id="integrations-info">
						<p class="info-box__text" id="integrations-info-text">
							<span class="info-box__strong" id="integrations-info-strong">
								How to route webhooks:
							</span>
							Each platform above shows a webhook URL. Paste that URL in the platform's
							webhook settings dashboard, then enter the signing secret below it.
							ChurnPulse verifies every incoming signature - unverified payloads are
							silently dropped.
						</p>
					</div>
				</section>
			{:else if activeTab === 'sequences'}
				<section class="panel-section" id="sequences-panel">
					<div class="section-header" id="sequences-header">
						<div class="section-header__copy" id="sequences-header-copy">
							<p class="section-label" id="sequences-label">Sequences</p>
							<h2 class="section-title" id="sequences-title">Signal-to-sequence coverage</h2>
						</div>
						{#if sequenceDirty}
							<span class="unsaved-indicator" id="sequences-unsaved">Unsaved</span>
						{/if}
					</div>

					<form
						class="preferences-form"
						method="POST"
						action="?/updateSequencePreferences"
						use:enhance={buildEnhanceHandler('updateSequencePreferences', () => {
							savedSequencePreferences = { ...sequencePreferences };
						})}
						id="sequences-form"
					>
						<input type="hidden" name="preferences" value={JSON.stringify(sequencePreferences)} id="sequences-hidden-preferences" />

						<div class="toggle-list" id="sequences-toggle-list">
							{#each data.sequenceSteps as item (item.type)}
								<div class="toggle-row" id={`sequence-toggle-${item.type}`}>
									<div class="toggle-copy" id={`sequence-copy-${item.type}`}>
										<p class="toggle-title" id={`sequence-title-${item.type}`}>
											{SIGNAL_CONFIGS[item.type].label}
										</p>
										<p class="toggle-description" id={`sequence-description-${item.type}`}>
											{item.description}
										</p>
									</div>
									<button
										class="toggle"
										class:toggle-active={sequencePreferences[item.type]}
										type="button"
										role="switch"
										aria-checked={sequencePreferences[item.type]}
										aria-label={`Toggle ${SIGNAL_CONFIGS[item.type].label} sequence`}
										id={`sequence-switch-${item.type}`}
										onclick={() => {
											toggleSequence(item.type);
										}}
									>
										<span class="toggle-thumb" id={`sequence-thumb-${item.type}`}></span>
									</button>
								</div>
							{/each}
						</div>

						<div class="info-box" id="sequences-info">
							<p class="info-box__text" id="sequences-info-text">
								All sequences use AI-generated personalization before send.
							</p>
						</div>

						<div class="save-row" id="sequences-save-row">
							<button
								class="action-button"
								class:action-button-unsaved={sequenceDirty}
								class:action-button-muted={!sequenceDirty}
								type="submit"
								disabled={!sequenceDirty}
								id="sequences-save-button"
							>
								Save sequence settings
							</button>
						</div>
					</form>
				</section>
			{:else}
				<section class="panel-section" id="notifications-panel">
					<div class="section-header" id="notifications-header">
						<div class="section-header__copy" id="notifications-header-copy">
							<p class="section-label" id="notifications-label">Notifications</p>
							<h2 class="section-title" id="notifications-title">Internal alert routing</h2>
						</div>
						{#if notificationsDirty}
							<span class="unsaved-indicator" id="notifications-unsaved">Unsaved</span>
						{/if}
					</div>

					<form
						class="field-stack"
						method="POST"
						action="?/updateNotificationPreferences"
						use:enhance={buildEnhanceHandler('updateNotificationPreferences', () => {
							savedNotifications = { ...notifications };
						})}
						id="notifications-form"
					>
						<input type="hidden" name="notifications" value={JSON.stringify(notifications)} id="notifications-hidden" />

						<label class="field" id="notifications-email-field">
							<span class="field-label" id="notifications-email-label">Alert email address</span>
							<input
								class="text-input"
								type="email"
								bind:value={notifications.alert_email}
								id="notifications-email-input"
								oninput={(event) => {
									notifications = {
										...notifications,
										alert_email: (event.currentTarget as HTMLInputElement).value
									};
								}}
							/>
						</label>

						<div class="toggle-row" id="notifications-high-mrr-row">
							<div class="toggle-copy" id="notifications-high-mrr-copy">
								<p class="toggle-title" id="notifications-high-mrr-title">
									Email me when High MRR customer detected
								</p>
								<p class="toggle-description" id="notifications-high-mrr-description">
									Enabled by default for immediate internal escalation.
								</p>
							</div>
							<button
								class="toggle"
								class:toggle-active={notifications.high_mrr_alerts_enabled}
								type="button"
								role="switch"
								aria-checked={notifications.high_mrr_alerts_enabled}
								aria-label="Toggle High MRR customer alerts"
								id="notifications-high-mrr-switch"
								onclick={() => {
									toggleNotification('high_mrr_alerts_enabled');
								}}
							>
								<span class="toggle-thumb" id="notifications-high-mrr-thumb"></span>
							</button>
						</div>

						<div class="toggle-row" id="notifications-digest-row">
							<div class="toggle-copy" id="notifications-digest-copy">
								<p class="toggle-title" id="notifications-digest-title">
									Daily digest of signals
								</p>
								<p class="toggle-description" id="notifications-digest-description">
									Sends a morning summary of yesterday's churn signals.
								</p>
							</div>
							<button
								class="toggle"
								class:toggle-active={notifications.daily_digest_enabled}
								type="button"
								role="switch"
								aria-checked={notifications.daily_digest_enabled}
								aria-label="Toggle daily digest notifications"
								id="notifications-digest-switch"
								onclick={() => {
									toggleNotification('daily_digest_enabled');
								}}
							>
								<span class="toggle-thumb" id="notifications-digest-thumb"></span>
							</button>
						</div>

						<div class="save-row" id="notifications-save-row">
							<button
								class="action-button"
								class:action-button-unsaved={notificationsDirty}
								class:action-button-muted={!notificationsDirty}
								type="submit"
								disabled={!notificationsDirty}
								id="notifications-save-button"
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
