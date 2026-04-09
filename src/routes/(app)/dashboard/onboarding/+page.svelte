<script lang="ts">
	import { page } from '$app/state';

	type Step = 1 | 2 | 3;

	let currentStep = $state<Step>(1);

	$effect(() => {
		if (page.url.searchParams.get('connected') === 'true') {
			currentStep = 3;
			return;
		}

		if (page.url.searchParams.get('step') === '2') {
			currentStep = 2;
		}
	});

	function advance(): void {
		currentStep = currentStep === 1 ? 2 : currentStep === 2 ? 3 : 3;
	}
</script>

<svelte:head>
	<title>Onboarding | ChurnPulse</title>
	<meta
		name="description"
		content="Connect Stripe and start monitoring churn signals with the ChurnPulse onboarding flow."
	/>
</svelte:head>

<section class="onboarding-page">
	<div class="progress-bar">
		{#each [1, 2, 3] as stepNumber, index (stepNumber)}
			<div class="progress-step">
				<div
					class="progress-circle"
					class:progress-circle-current={currentStep === stepNumber}
					class:progress-circle-complete={currentStep > stepNumber}
				>
					{#if currentStep > stepNumber}
						<svg viewBox="0 0 16 16" aria-hidden="true">
							<path
								d="M3.5 8.5 6.4 11.4 12.5 5.3"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					{:else}
						<span>{stepNumber}</span>
					{/if}
				</div>

				{#if index < 2}
					<div class="progress-line" class:progress-line-complete={currentStep > stepNumber}></div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="onboarding-card">
		{#if currentStep === 1}
			<div class="step step-welcome">
				<div class="brand-lockup">
					<svg class="brand-bolt" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
						<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
					</svg>
					<p class="brand-label">ChurnPulse</p>
				</div>

				<h1 class="hero-title">Welcome to ChurnPulse.</h1>
				<p class="hero-copy">
					We’ll connect your Stripe workspace, start listening for churn signals, and get your recovery automations ready in three focused steps.
				</p>

				<div class="step-list">
					<div class="step-list-item">
						<span>1</span>
						<p>Connect Stripe access</p>
					</div>
					<div class="step-list-connector"></div>
					<div class="step-list-item">
						<span>2</span>
						<p>Verify webhook ingestion and sequence coverage</p>
					</div>
					<div class="step-list-connector"></div>
					<div class="step-list-item">
						<span>3</span>
						<p>Start monitoring every at-risk customer in real time</p>
					</div>
				</div>

				<div class="step-actions">
					<button class="primary-button" type="button" onclick={advance}>Let&apos;s start →</button>
					<a class="secondary-link" href="/dashboard?skip_onboarding=1">Skip</a>
				</div>
			</div>
		{:else if currentStep === 2}
			<div class="step step-connect">
				<p class="section-kicker">Step 2 / 3</p>
				<h1 class="hero-title">Connect Stripe with secure OAuth access.</h1>
				<p class="hero-copy">
					ChurnPulse reads billing events, classifies churn risk, and schedules recovery sequences without storing your Stripe secret key.
				</p>

				<div class="diagram">
					<div class="diagram-node">Your Stripe</div>
					<div class="diagram-arrow">→</div>
					<div class="diagram-node">OAuth access</div>
					<div class="diagram-arrow">→</div>
					<div class="diagram-node">ChurnPulse reads events</div>
					<div class="diagram-arrow">→</div>
					<div class="diagram-node">You get alerts</div>
				</div>

				<div class="connect-panel">
					<p class="connect-title">Ready when you are.</p>
					<p class="connect-copy">
						Authorize the connected account, then ChurnPulse will route you back here automatically.
					</p>
					<a class="primary-button" href="/api/stripe/connect?next=/dashboard/onboarding">
						Connect Stripe
					</a>
				</div>
			</div>
		{:else}
			<div class="step step-complete">
				<div class="checkmark-wrap" aria-hidden="true">
					<svg viewBox="0 0 80 80" class="checkmark-svg">
						<circle class="checkmark-circle" cx="40" cy="40" r="30"></circle>
						<path class="checkmark-path" d="M26 40 36 50 55 31"></path>
					</svg>
				</div>

				<h1 class="hero-title">You&apos;re all set. Watching for signals now.</h1>
				<p class="hero-copy">
					Stripe is connected and ChurnPulse is ready to surface at-risk customers the moment a churn signal appears.
				</p>

				<div class="step-actions">
					<a class="primary-button" href="/dashboard">Go to dashboard →</a>
					<a class="secondary-link" href="/dashboard/signals">While you wait: learn about the 6 signals →</a>
				</div>
			</div>
		{/if}
	</div>
</section>

<style>
	.onboarding-page {
		display: flex;
		min-height: 100vh;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		padding: 2rem 1.25rem;
		background:
			radial-gradient(circle at top, rgba(0, 229, 255, 0.08), transparent 34%),
			var(--bg-base);
	}

	.progress-bar,
	.progress-step,
	.step-list-item,
	.step-actions,
	.diagram {
		display: flex;
		align-items: center;
	}

	.progress-bar {
		gap: 0.5rem;
	}

	.progress-circle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.18);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.progress-circle svg {
		width: 1rem;
		height: 1rem;
	}

	.progress-circle-current {
		border-color: var(--accent-cyan);
		background: var(--accent-cyan);
		color: #000;
	}

	.progress-circle-complete {
		border-color: var(--accent-cyan);
		background: rgba(0, 229, 255, 0.12);
		color: var(--accent-cyan);
	}

	.progress-line {
		width: 3rem;
		height: 1px;
		background: rgba(255, 255, 255, 0.1);
	}

	.progress-line-complete {
		background: rgba(0, 229, 255, 0.48);
	}

	.onboarding-card {
		width: min(100%, 52rem);
		border: 1px solid rgba(255, 255, 255, 0.08);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 24%),
			var(--bg-surface);
		padding: 2rem;
	}

	.step {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.step-welcome {
		animation: fade-in 500ms ease-out;
	}

	.brand-lockup {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--accent-cyan);
		animation: fade-in 450ms ease-out;
	}

	.brand-bolt {
		width: 1.1rem;
		height: 1.1rem;
	}

	.brand-label,
	.section-kicker,
	.diagram-node {
		font-family: 'IBM Plex Mono', monospace;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.brand-label,
	.section-kicker {
		margin: 0;
		font-size: 0.72rem;
		color: var(--accent-cyan);
	}

	.hero-title {
		margin: 0;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1.75rem;
		font-weight: 500;
		line-height: 1.25;
		color: var(--text-primary);
		animation: fade-in 650ms ease-out;
	}

	.hero-copy,
	.connect-copy,
	.step-list-item p {
		margin: 0;
		font-size: 0.96rem;
		line-height: 1.75;
		color: var(--text-secondary);
	}

	.step-list {
		display: grid;
		gap: 0.75rem;
		max-width: 32rem;
		animation: fade-in 800ms ease-out;
	}

	.step-list-item {
		gap: 0.8rem;
	}

	.step-list-item span {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.65rem;
		height: 1.65rem;
		border: 1px solid rgba(0, 229, 255, 0.18);
		background: rgba(0, 229, 255, 0.08);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.72rem;
		color: var(--accent-cyan);
	}

	.step-list-connector {
		width: 1px;
		height: 1rem;
		margin-left: 0.82rem;
		background: rgba(255, 255, 255, 0.08);
	}

	.step-actions {
		gap: 1rem;
		flex-wrap: wrap;
	}

	.primary-button,
	.secondary-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 2.85rem;
		padding: 0.8rem 1.1rem;
	}

	.primary-button {
		background: var(--accent-cyan);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.8rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: #000;
	}

	.secondary-link {
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.diagram {
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.diagram-node {
		padding: 0.75rem 0.95rem;
		border: 1px solid rgba(255, 255, 255, 0.08);
		background: var(--bg-elevated);
		font-size: 0.68rem;
		color: var(--text-primary);
	}

	.diagram-arrow {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.95rem;
		color: var(--accent-cyan);
	}

	.connect-panel {
		display: grid;
		gap: 0.75rem;
		max-width: 30rem;
		padding: 1rem;
		border: 1px solid rgba(0, 229, 255, 0.16);
		background: rgba(0, 229, 255, 0.04);
	}

	.connect-title {
		margin: 0;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1rem;
		color: var(--text-primary);
	}

	.checkmark-wrap {
		display: inline-flex;
		width: 5rem;
		height: 5rem;
	}

	.checkmark-svg {
		width: 100%;
		height: 100%;
	}

	.checkmark-circle,
	.checkmark-path {
		fill: none;
		stroke: var(--accent-cyan);
		stroke-width: 2.5;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.checkmark-circle {
		stroke-dasharray: 188;
		stroke-dashoffset: 188;
		animation: draw-circle 900ms ease forwards;
	}

	.checkmark-path {
		stroke-dasharray: 48;
		stroke-dashoffset: 48;
		animation: draw-check 500ms ease 650ms forwards;
	}

	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(10px);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes draw-circle {
		to {
			stroke-dashoffset: 0;
		}
	}

	@keyframes draw-check {
		to {
			stroke-dashoffset: 0;
		}
	}

	@media (max-width: 768px) {
		.onboarding-card {
			padding: 1.4rem;
		}

		.diagram {
			flex-direction: column;
			align-items: flex-start;
		}

		.diagram-arrow {
			transform: rotate(90deg);
		}
	}
</style>
