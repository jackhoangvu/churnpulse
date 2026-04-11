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
		content="Connect Polar and start monitoring churn signals with the ChurnPulse onboarding flow."
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

	<div class="onboarding-card card card-brand">
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
					We’ll connect your Polar workspace, start listening for churn signals, and get your
					recovery automations ready in three focused steps.
				</p>

				<div class="step-list">
					<div class="step-list-item">
						<span>1</span>
						<p>Connect Polar access</p>
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
				<h1 class="hero-title">Connect Polar with secure OAuth access.</h1>
				<p class="hero-copy">
					ChurnPulse reads billing events, classifies churn risk, and schedules recovery sequences
					without storing your Polar secret key.
				</p>

				<div class="diagram">
					<div class="diagram-node">Your Polar</div>
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
					<a class="primary-button" href="/api/polar/connect?next=/dashboard/onboarding">
						Connect Polar
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
					Polar is connected and ChurnPulse is ready to surface at-risk customers the moment a
					churn signal appears.
				</p>

				<div class="step-actions">
					<a class="primary-button" href="/dashboard">Go to dashboard →</a>
					<a class="secondary-link" href="/dashboard/signals">
						While you wait: learn about the 6 signals →
					</a>
				</div>
			</div>
		{/if}
	</div>
</section>
