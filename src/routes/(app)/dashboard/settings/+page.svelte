<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
	import type { PageData } from './$types';
	import type { Provider } from '$lib/types';

	interface Props {
		data: PageData;
	}

	type ProviderFilter = 'all' | Provider;
	type SettingsActionResult = ActionResult<{ message?: string }, Record<string, never>>;

	let { data }: Props = $props();
	let providerFilter = $state<ProviderFilter>('all');
	let toastMessage = $state<string | null>(null);
	let toastType = $state<'success' | 'error'>('success');

	const filteredWebhookEvents = $derived.by(() => {
		if (providerFilter === 'all') {
			return data.webhookEvents;
		}

		return data.webhookEvents.filter((event) => event.provider === providerFilter);
	});

	function formatProviderStatus(connected: boolean): string {
		return connected ? 'Connected' : 'Not connected';
	}

	function integrationActionLabel(type: Provider): string {
		if (type === 'polar') {
			return 'Connect Polar';
		}

		if (type === 'stripe') {
			return 'Connect Stripe';
		}

		if (type === 'paddle') {
			return 'Save Paddle Secret';
		}

		return 'Save Lemon Squeezy Secret';
	}

	function showToast(message: string, type: 'success' | 'error' = 'success'): void {
		toastMessage = message;
		toastType = type;
		window.setTimeout(() => {
			toastMessage = null;
		}, 4000);
	}

	function enhanceWithToast(successMessage?: string) {
		return () => {
			return async ({ result }: { result: SettingsActionResult }) => {
				if (result.type === 'success') {
					showToast(successMessage ?? 'Settings saved.', 'success');
					return;
				}

				if (result.type === 'failure') {
					showToast(result.data?.message ?? 'The change could not be saved.', 'error');
				}
			};
		};
	}
</script>

<svelte:head>
	<title>Settings | ChurnPulse</title>
	<meta
		name="description"
		content="Manage integrations, notifications, API access, and provider event history for your ChurnPulse workspace."
	/>
</svelte:head>

<section class="page" id="settings-page">
	<div class="page__header" id="settings-header">
		<div class="page__header-copy" id="settings-header-copy">
			<p class="page-kicker" id="settings-kicker">Workspace Controls</p>
			<h1 class="page__title" id="settings-title">Settings</h1>
			<p class="page__subtitle" id="settings-subtitle">
				Connect billing systems, tune notifications, and review inbound provider activity.
			</p>
		</div>
	</div>

	<section class="settings-section" id="settings-integrations">
		<div class="settings-section__header" id="settings-integrations-header">
			<div class="settings-section__copy" id="settings-integrations-copy">
				<h2 class="settings-section__title" id="settings-integrations-title">Integrations</h2>
				<p class="settings-section__desc" id="settings-integrations-desc">
					OAuth providers connect in one click. Webhook providers store their signing secrets here.
				</p>
			</div>
		</div>
		<div class="settings-section__body" id="settings-integrations-body">
			{#each data.integrations as integration (integration.type)}
				<section class="settings-provider-card" id={`settings-provider-${integration.type}`}>
					<div class="settings-provider-card__header" id={`settings-provider-header-${integration.type}`}>
						<div class="settings-provider-card__meta" id={`settings-provider-meta-${integration.type}`}>
							<div
								class="settings-provider-card__swatch"
								id={`settings-provider-swatch-${integration.type}`}
								style={`--provider-color: ${integration.color}`}
								aria-hidden="true"
							></div>
							<div class="settings-provider-card__copy" id={`settings-provider-copy-${integration.type}`}>
								<h3 class="settings-provider-card__title" id={`settings-provider-title-${integration.type}`}>
									{integration.label}
								</h3>
								<p class="settings-provider-card__desc" id={`settings-provider-desc-${integration.type}`}>
									{integration.description}
								</p>
							</div>
						</div>
						<div class="settings-provider-card__status" id={`settings-provider-status-${integration.type}`}>
							<span
								class={`badge ${integration.connected ? 'badge-success' : 'badge-muted'}`}
								id={`settings-provider-badge-${integration.type}`}
							>
								{formatProviderStatus(integration.connected)}
							</span>
							<span class="plan-badge" id={`settings-provider-mode-${integration.type}`}>
								{integration.connectionType}
							</span>
						</div>
					</div>

					<div class="settings-provider-card__grid" id={`settings-provider-grid-${integration.type}`}>
						<div class="webhook-url-row" id={`settings-provider-webhook-${integration.type}`}>
							<label class="webhook-url-label" id={`settings-provider-webhook-label-${integration.type}`} for={`settings-provider-webhook-input-${integration.type}`}>
								Webhook URL
							</label>
							<div class="webhook-url-input-row" id={`settings-provider-webhook-row-${integration.type}`}>
								<input
									class="form-input form-input--readonly"
									id={`settings-provider-webhook-input-${integration.type}`}
									type="text"
									value={integration.webhookUrl}
									readonly
								/>
								<a
									class="btn btn-secondary btn-sm"
									href={integration.docsUrl}
									target="_blank"
									rel="noreferrer"
									id={`settings-provider-docs-${integration.type}`}
								>
									Docs
								</a>
							</div>
							<p class="webhook-url-helper" id={`settings-provider-helper-${integration.type}`}>
								{integration.connectedAt
									? `Connected ${new Date(integration.connectedAt).toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric',
											year: 'numeric'
										})}`
									: 'No live connection timestamp yet.'}
							</p>
						</div>

						<div class="integration-status-row" id={`settings-provider-account-${integration.type}`}>
							<span class="integration-status-label" id={`settings-provider-account-label-${integration.type}`}>
								Account ID
							</span>
							<span class="api-key-value" id={`settings-provider-account-value-${integration.type}`}>
								{integration.accountId ?? 'Not available'}
							</span>
						</div>

						<div class="integration-status-row" id={`settings-provider-secret-${integration.type}`}>
							<span class="integration-status-label" id={`settings-provider-secret-label-${integration.type}`}>
								Webhook secret
							</span>
							<span class={`badge ${integration.webhookSecretSaved ? 'badge-success' : 'badge-muted'}`} id={`settings-provider-secret-badge-${integration.type}`}>
								{integration.webhookSecretSaved ? 'Saved' : 'Not saved'}
							</span>
						</div>

						{#if integration.type === 'polar'}
							<div class="settings-provider-card__actions" id="settings-provider-actions-polar">
								<a class="btn btn-primary" href="/api/polar/connect" id="settings-provider-connect-polar">
									{integrationActionLabel(integration.type)}
								</a>
								{#if integration.connected}
									<div class="settings-danger-zone" id="settings-danger-disconnect">
										<div class="settings-danger-zone__header" id="settings-danger-header">
											<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="2" aria-hidden="true" id="settings-danger-icon">
												<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
												<line x1="12" y1="9" x2="12" y2="13" />
												<line x1="12" y1="17" x2="12.01" y2="17" />
											</svg>
											<h4 id="settings-danger-title">Danger zone</h4>
										</div>
										<p class="settings-danger-zone__copy" id="settings-danger-copy">
											Disconnecting Polar stops churn detection and scheduled recovery sequences until you reconnect.
										</p>
										<form class="settings-provider-card__form" method="POST" action="?/disconnectPolar" id="settings-provider-form-polar" use:enhance={enhanceWithToast('Polar disconnected.')}>
											<label class="form-group" id="settings-provider-confirm-group-polar">
												<span class="form-label" id="settings-provider-confirm-label-polar">
													Type <code class="settings-inline-code" id="settings-provider-confirm-code-polar">disconnect</code> to confirm
												</span>
												<div class="settings-danger-zone__row" id="settings-danger-row">
													<input class="form-input form-input--danger" id="settings-provider-confirm-input-polar" name="confirmation" type="text" autocomplete="off" placeholder="disconnect" pattern="disconnect" required />
													<button class="btn btn-danger" type="submit" id="settings-provider-disconnect-polar">
														Disconnect Polar
													</button>
												</div>
											</label>
										</form>
									</div>
								{/if}
							</div>
						{:else if integration.type === 'stripe'}
							<div class="settings-provider-card__actions" id="settings-provider-actions-stripe">
								<a class="btn btn-primary" href="/api/stripe/connect" id="settings-provider-connect-stripe">
									{integrationActionLabel(integration.type)}
								</a>
							</div>
						{:else if integration.type === 'paddle'}
							<form class="settings-provider-card__form" method="POST" action="?/savePaddleSecret" id="settings-provider-form-paddle" use:enhance={enhanceWithToast('Paddle secret saved.')}>
								<label class="form-group" id="settings-provider-secret-group-paddle">
									<span class="form-label" id="settings-provider-secret-label-paddle">Paddle signing secret</span>
									<input class="form-input" id="settings-provider-secret-input-paddle" name="secret" type="password" placeholder="pdl_live_..." autocomplete="off" />
								</label>
								<div class="settings-provider-card__actions" id="settings-provider-actions-paddle">
									<button class="btn btn-primary" type="submit" id="settings-provider-submit-paddle">
										{integrationActionLabel(integration.type)}
									</button>
								</div>
							</form>
						{:else}
							<form class="settings-provider-card__form" method="POST" action="?/saveLemonSqueezySecret" id="settings-provider-form-lemonsqueezy" use:enhance={enhanceWithToast('Lemon Squeezy secret saved.')}>
								<label class="form-group" id="settings-provider-secret-group-lemonsqueezy">
									<span class="form-label" id="settings-provider-secret-label-lemonsqueezy">Lemon Squeezy signing secret</span>
									<input class="form-input" id="settings-provider-secret-input-lemonsqueezy" name="secret" type="password" placeholder="ls_whsec_..." autocomplete="off" />
								</label>
								<div class="settings-provider-card__actions" id="settings-provider-actions-lemonsqueezy">
									<button class="btn btn-primary" type="submit" id="settings-provider-submit-lemonsqueezy">
										{integrationActionLabel(integration.type)}
									</button>
								</div>
							</form>
						{/if}
					</div>
				</section>
			{/each}
		</div>
	</section>

	<section class="settings-section" id="settings-api-keys">
		<div class="settings-section__header" id="settings-api-keys-header">
			<div class="settings-section__copy" id="settings-api-keys-copy">
				<h2 class="settings-section__title" id="settings-api-keys-title">API Keys</h2>
				<p class="settings-section__desc" id="settings-api-keys-desc">
					Server-side automation keys will be self-serve. The preview below shows the expected format.
				</p>
			</div>
		</div>
		<div class="settings-section__body" id="settings-api-keys-body">
			{#each data.apiKeys as apiKey (apiKey.id)}
				<div class="api-key-row" id={`api-key-row-${apiKey.id}`}>
					<div class="api-key-copy" id={`api-key-copy-${apiKey.id}`}>
						<p class="api-key-value" id={`api-key-label-${apiKey.id}`}>{apiKey.label}</p>
						<p class="api-key-meta" id={`api-key-meta-${apiKey.id}`}>{apiKey.meta}</p>
					</div>
					<code class="settings-inline-code" id={`api-key-value-${apiKey.id}`}>{apiKey.value}</code>
					<button class="api-key-delete" type="button" id={`api-key-delete-${apiKey.id}`} aria-label={`Delete ${apiKey.label}`}>
						<svg class="api-key-delete__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true" id={`api-key-delete-icon-${apiKey.id}`}>
							<path class="api-key-delete__path" d="M3 6h18" />
							<path class="api-key-delete__path" d="M8 6V4h8v2" />
							<path class="api-key-delete__path" d="m19 6-1 14H6L5 6" />
						</svg>
					</button>
				</div>
			{/each}
		</div>
	</section>

	<section class="settings-section" id="settings-notifications">
		<div class="settings-section__header" id="settings-notifications-header">
			<div class="settings-section__copy" id="settings-notifications-copy">
				<h2 class="settings-section__title" id="settings-notifications-title">Notification Preferences</h2>
				<p class="settings-section__desc" id="settings-notifications-desc">
					Route high-value recovery alerts to the right inbox and control operator digest email volume.
				</p>
			</div>
		</div>
		<form class="settings-section__body" method="POST" action="?/updateNotificationPreferences" id="settings-notifications-form" use:enhance={enhanceWithToast('Notification preferences saved successfully.')}>
			<label class="form-group" id="settings-alert-email-group">
				<span class="form-label" id="settings-alert-email-label">Alert email</span>
				<input
					class="form-input"
					id="settings-alert-email-input"
					name="alert_email"
					type="email"
					value={data.notifications.alert_email}
					placeholder="ops@yourcompany.com"
				/>
			</label>

			<label class="notif-row" id="settings-notification-row-high-mrr">
				<div class="notif-row__copy" id="settings-notification-copy-high-mrr">
					<p class="notif-row__title" id="settings-notification-title-high-mrr">High MRR alerts</p>
					<p class="notif-row__desc" id="settings-notification-desc-high-mrr">
						Send immediate alerts when high-value accounts show churn risk.
					</p>
				</div>
				<span class="toggle {data.notifications.high_mrr_alerts_enabled ? 'toggle--active' : ''}" id="settings-notification-toggle-high-mrr">
					<span class="toggle__track" aria-hidden="true">
						<span class="toggle__thumb"></span>
					</span>
					<input
						class="sr-only"
						id="settings-notification-input-high-mrr"
						name="high_mrr_alerts_enabled"
						type="checkbox"
						checked={data.notifications.high_mrr_alerts_enabled}
						aria-labelledby="settings-notification-title-high-mrr"
						aria-describedby="settings-notification-desc-high-mrr"
					/>
					<span class="toggle__label" id="settings-notification-label-high-mrr" aria-live="polite">
						{data.notifications.high_mrr_alerts_enabled ? 'Enabled' : 'Disabled'}
					</span>
				</span>
			</label>

			<label class="notif-row" id="settings-notification-row-digest">
				<div class="notif-row__copy" id="settings-notification-copy-digest">
					<p class="notif-row__title" id="settings-notification-title-digest">Daily digest</p>
					<p class="notif-row__desc" id="settings-notification-desc-digest">
						Receive a single daily summary of open recovery work.
					</p>
				</div>
				<span class="toggle {data.notifications.daily_digest_enabled ? 'toggle--active' : ''}" id="settings-notification-toggle-digest">
					<span class="toggle__track" aria-hidden="true">
						<span class="toggle__thumb"></span>
					</span>
					<input
						class="sr-only"
						id="settings-notification-input-digest"
						name="daily_digest_enabled"
						type="checkbox"
						checked={data.notifications.daily_digest_enabled}
						aria-labelledby="settings-notification-title-digest"
						aria-describedby="settings-notification-desc-digest"
					/>
					<span class="toggle__label" id="settings-notification-label-digest" aria-live="polite">
						{data.notifications.daily_digest_enabled ? 'Enabled' : 'Disabled'}
					</span>
				</span>
			</label>

			<div class="settings-section__actions" id="settings-notifications-actions">
				<button class="btn btn-primary" type="submit" id="settings-notifications-submit">
					Save Notification Preferences
				</button>
			</div>
		</form>
	</section>

	<section class="settings-section" id="settings-webhooks">
		<div class="settings-section__header" id="settings-webhooks-header">
			<div class="settings-section__copy" id="settings-webhooks-copy">
				<h2 class="settings-section__title" id="settings-webhooks-title">Webhook Events</h2>
				<p class="settings-section__desc" id="settings-webhooks-desc">
					Recent inbound provider events. Backed by the shared <code class="settings-inline-code" id="settings-webhooks-code">provider_events</code> log.
				</p>
			</div>
		</div>
		<div class="settings-section__body" id="settings-webhooks-body">
			<div class="filter-tabs" id="settings-webhooks-filters">
				<button class="filter-tab" class:filter-tab--active={providerFilter === 'all'} type="button" id="settings-webhooks-filter-all" onclick={() => (providerFilter = 'all')}>
					All
				</button>
				{#each ['polar', 'stripe', 'paddle', 'lemonsqueezy'] as provider (provider)}
					<button
						class="filter-tab"
						class:filter-tab--active={providerFilter === provider}
						type="button"
						id={`settings-webhooks-filter-${provider}`}
						onclick={() => (providerFilter = provider as ProviderFilter)}
					>
						{provider}
					</button>
				{/each}
			</div>

			<div class="settings-webhook-list" id="settings-webhook-list">
				{#if filteredWebhookEvents.length === 0}
					<div class="settings-empty-state" id="settings-webhooks-empty">
						<p class="settings-empty-state__text" id="settings-webhooks-empty-text">
							No provider events match the current filter.
						</p>
					</div>
				{:else}
					{#each filteredWebhookEvents as event (event.id)}
						<div class="webhook-event-row" id={`settings-webhook-event-${event.id}`}>
							<span class={`webhook-event-dot ${event.dotClass}`} id={`settings-webhook-dot-${event.id}`}></span>
							<span class="plan-badge" id={`settings-webhook-provider-${event.id}`}>{event.providerLabel}</span>
							<span class={`webhook-event-type ${event.resultClass}`} id={`settings-webhook-type-${event.id}`}>{event.eventType}</span>
							<span class="webhook-event-id" id={`settings-webhook-id-${event.id}`}>{event.eventId}</span>
							<span class="webhook-event-result" id={`settings-webhook-result-${event.id}`}>{event.resultLabel}</span>
							<span class="webhook-event-time" id={`settings-webhook-time-${event.id}`}>{event.timeLabel}</span>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</section>

	<section class="settings-section" id="settings-audit-log">
		<div class="settings-section__header" id="settings-audit-log-header">
			<div class="settings-section__copy" id="settings-audit-log-copy">
				<h2 class="settings-section__title" id="settings-audit-log-title">Audit Log</h2>
				<p class="settings-section__desc" id="settings-audit-log-desc">
					Locked workspace governance history. Full export and retention controls ship on Enterprise.
				</p>
			</div>
			<span class="badge badge-violet" id="settings-audit-log-badge">Enterprise</span>
		</div>
		<div class="settings-section__body" id="settings-audit-log-body">
			{#each data.auditLog as entry (entry.id)}
				<div class="audit-row" id={`settings-audit-row-${entry.id}`}>
					<div class={`audit-icon audit-icon--${entry.kind}`} id={`settings-audit-icon-${entry.id}`}>
						<svg class="audit-icon__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true" id={`settings-audit-svg-${entry.id}`}>
							{#if entry.kind === 'created'}
								<path class="audit-icon__path" d="M12 5v14M5 12h14" />
							{:else if entry.kind === 'updated'}
								<path class="audit-icon__path" d="M21 12a9 9 0 1 1-3-6.7" />
								<path class="audit-icon__path" d="M21 3v6h-6" />
							{:else if entry.kind === 'revoked'}
								<path class="audit-icon__path" d="M18 6 6 18" />
								<path class="audit-icon__path" d="m6 6 12 12" />
							{:else}
								<path class="audit-icon__path" d="M12 12h.01" />
								<path class="audit-icon__path" d="M12 7v2" />
								<path class="audit-icon__path" d="M12 15v2" />
							{/if}
						</svg>
					</div>
					<div class="audit-copy" id={`settings-audit-copy-${entry.id}`}>
						<p class={`audit-action audit-action--${entry.kind}`} id={`settings-audit-action-${entry.id}`}>{entry.action}</p>
						<p class="audit-actor" id={`settings-audit-actor-${entry.id}`}>{entry.actor}</p>
					</div>
					<span class="badge badge-muted" id={`settings-audit-locked-${entry.id}`}>Locked</span>
					<span class="audit-time" id={`settings-audit-time-${entry.id}`}>{entry.timeLabel}</span>
				</div>
			{/each}
		</div>
	</section>

	{#if toastMessage}
		<div class="toast-stack" id="settings-toast-stack" aria-live="polite">
			<div class={`toast toast--${toastType}`} id="settings-toast">
				<p class="toast__message" id="settings-toast-message">{toastMessage}</p>
			</div>
		</div>
	{/if}
</section>
