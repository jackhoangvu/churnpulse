<script lang="ts">
	import SignIn from 'clerk-sveltekit/client/SignIn.svelte';

	const clerkAppearance = {
		layout: {
			socialButtonsVariant: 'blockButton'
		},
		elements: {
			badge: 'auth-clerk-badge',
			card: 'auth-clerk-card',
			cardBox: 'auth-clerk-card-box',
			dividerLine: 'auth-clerk-divider-line',
			dividerText: 'auth-clerk-divider-text',
			footer: 'auth-clerk-footer',
			footerAction: 'auth-clerk-footer-action',
			footerActionLink: 'auth-clerk-link',
			footerActionText: 'auth-clerk-footer-text',
			formButtonPrimary: 'auth-clerk-button',
			formFieldInput: 'auth-clerk-input',
			formFieldInputShowPasswordButton: 'auth-clerk-password-toggle',
			formFieldLabel: 'auth-clerk-field-label',
			formFieldSuccessText: 'auth-clerk-field-success',
			rootBox: 'auth-clerk-root',
			pageScrollBox: 'auth-clerk-scroll',
			headerTitle: 'hidden',
			headerSubtitle: 'hidden',
			socialButtonsBlockButton: 'auth-clerk-social',
			socialButtonsBlockButtonArrow: 'auth-clerk-social-arrow',
			socialButtonsBlockButtonText: 'auth-clerk-social-text'
		},
		variables: {
			colorBackground: '#1a1a1f',
			colorInputBackground: '#222229',
			colorInputText: '#EDEDED',
			colorText: '#EDEDED',
			colorTextSecondary: '#A0A0AB',
			colorPrimary: '#4F6EF7',
			borderRadius: '10px'
		}
	} as const;
</script>

<svelte:head>
	<title>Sign in | ChurnPulse</title>
	<meta
		name="description"
		content="Access your ChurnPulse workspace and respond to churn signals before revenue slips away."
	/>
</svelte:head>

<section class="auth-page" id="auth-sign-in-page">
	<div class="auth-shell" id="auth-sign-in-shell">
		<div class="auth-stage" id="auth-sign-in-stage">
			<div class="auth-brand" id="auth-sign-in-brand">
				<svg
					class="auth-brand__bolt"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
					id="auth-sign-in-bolt"
				>
					<path class="auth-brand__bolt-path" d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
				</svg>
				<span class="auth-brand__label" id="auth-sign-in-brand-label">ChurnPulse</span>
			</div>

			<div class="auth-copy" id="auth-sign-in-copy">
				<p class="auth-kicker" id="auth-sign-in-kicker">Sign in to your workspace</p>
				<h1 class="auth-title" id="auth-sign-in-title">Operator access</h1>
				<p class="auth-subtitle" id="auth-sign-in-subtitle">
					Pick up live churn signals, review recovery sequences, and get back to revenue protection.
				</p>
			</div>

			<div class="auth-proof-list" id="auth-sign-in-proof-list" aria-label="Workspace benefits">
				<div class="auth-proof-chip" id="auth-sign-in-proof-live">Live billing alerts</div>
				<div class="auth-proof-chip" id="auth-sign-in-proof-readonly">Read-only provider access</div>
				<div class="auth-proof-chip" id="auth-sign-in-proof-fast">60-second reconnect flow</div>
			</div>
		</div>

		<div class="auth-card card card-brand" id="auth-sign-in-card">
			<div class="auth-card__header" id="auth-sign-in-card-header">
				<p class="auth-card__eyebrow" id="auth-sign-in-card-eyebrow">Welcome back</p>
				<h2 class="auth-card__title" id="auth-sign-in-card-title">Continue to ChurnPulse</h2>
			</div>

			<SignIn appearance={clerkAppearance} redirectUrl="/dashboard" signUpUrl="/sign-up" />
		</div>
	</div>
</section>
