<script lang="ts">
	import SignUp from 'clerk-sveltekit/client/SignUp.svelte';
	import { page } from '$app/state';
	import Icon from '$lib/components/ui/Icon.svelte';

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
			colorBackground: 'oklch(16% 0.015 255)',
			colorInputBackground: 'oklch(18% 0.015 255)',
			colorInputText: 'oklch(96% 0.005 255)',
			colorText: 'oklch(96% 0.005 255)',
			colorTextSecondary: 'oklch(68% 0.02 255)',
			colorPrimary: 'oklch(52% 0.22 264)',
			borderRadius: '10px'
		}
	} as const;

	const contextualMessage = $derived(
		page.url.searchParams.get('demo_action')
			? 'Create your account to start recovering real customers.'
			: null
	);
</script>

<svelte:head>
	<title>Create account | ChurnPulse</title>
	<meta
		name="description"
		content="Create your ChurnPulse account and connect Polar to launch retention workflows in minutes."
	/>
</svelte:head>

<section class="auth-page" id="auth-sign-up-page">
	<div class="auth-shell" id="auth-sign-up-shell">
		<div class="auth-stage" id="auth-sign-up-stage">
			<div class="auth-brand" id="auth-sign-up-brand">
				<Icon class="auth-brand__bolt" name="bolt" size={20} />
				<span class="auth-brand__label" id="auth-sign-up-brand-label">ChurnPulse</span>
			</div>

			<div class="auth-copy" id="auth-sign-up-copy">
				<p class="auth-kicker" id="auth-sign-up-kicker">Create your workspace</p>
				<h1 class="auth-title" id="auth-sign-up-title">Launch control</h1>
				<p class="auth-subtitle" id="auth-sign-up-subtitle">
					Connect your billing stack, detect churn risk early, and let recovery sequences start automatically.
				</p>
			</div>

			<div class="auth-proof-list" id="auth-sign-up-proof-list" aria-label="Product benefits">
				<div class="auth-proof-chip" id="auth-sign-up-proof-platforms">Stripe, Paddle, LS, Polar</div>
				<div class="auth-proof-chip" id="auth-sign-up-proof-signals">7 churn signals out of the box</div>
				<div class="auth-proof-chip" id="auth-sign-up-proof-ai">AI-personalized win-back emails</div>
			</div>
		</div>

		<div class="auth-card card card-brand" id="auth-sign-up-card">
			<div class="auth-card__header" id="auth-sign-up-card-header">
				<p class="auth-card__eyebrow" id="auth-sign-up-card-eyebrow">Start free</p>
				<h2 class="auth-card__title" id="auth-sign-up-card-title">Create your account</h2>
			</div>

			{#if contextualMessage}
				<p class="auth-card__context" aria-live="polite">{contextualMessage}</p>
			{/if}

			<SignUp appearance={clerkAppearance} redirectUrl="/dashboard" signInUrl="/sign-in" />
		</div>
	</div>
</section>
