<script lang="ts">
	import SignIn from 'clerk-sveltekit/client/SignIn.svelte';

	const clerkAppearance = {
		elements: {
			card: 'bg-transparent shadow-none border-0',
			rootBox: 'w-full',
			headerTitle: 'hidden',
			headerSubtitle: 'hidden',
			socialButtonsBlockButton:
				'border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]',
			formButtonPrimary:
				'border border-[var(--accent-cyan-border)] bg-[var(--accent-cyan-dim)] text-[var(--accent-cyan)] hover:bg-[rgba(0,229,255,0.22)]',
			formFieldInput:
				'border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-primary)] focus:border-[var(--accent-cyan)]',
			footerActionLink: 'text-[var(--accent-cyan)] hover:text-white'
		},
		variables: {
			colorBackground: '#111113',
			colorInputBackground: '#1A1A1D',
			colorInputText: '#F0F0F2',
			colorText: '#F0F0F2',
			colorTextSecondary: '#8A8A92',
			colorPrimary: '#00E5FF',
			borderRadius: '0px'
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

<section
	class="flex min-h-screen items-center justify-center bg-[var(--bg-base)] px-6 py-10 text-[var(--text-primary)]"
>
	<div class="w-full max-w-md border border-[var(--border-default)] bg-[var(--bg-surface)] p-8 shadow-[var(--shadow-surface)]">
		<div class="mb-8 space-y-3">
			<div class="flex items-center gap-3 text-[var(--accent-cyan)]">
				<svg
					class="h-5 w-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
				</svg>
				<span class="font-mono text-sm uppercase tracking-[0.24em]">ChurnPulse</span>
			</div>
			<h1 class="font-mono text-3xl uppercase tracking-[0.08em] text-white">Operator access</h1>
			<p class="text-sm leading-6 text-[var(--text-secondary)]">
				Stop churn before it starts.
			</p>
		</div>

		<SignIn appearance={clerkAppearance} redirectUrl="/dashboard" signUpUrl="/sign-up" />
	</div>
</section>

<style>
	:global(.cl-footer) {
		background: transparent;
	}
</style>
