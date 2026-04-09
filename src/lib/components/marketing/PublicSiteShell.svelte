<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		eyebrow: string;
		title: string;
		description: string;
		children: Snippet;
	}

	const legalLinks = [
		{ href: '/pricing', label: 'Pricing' },
		{ href: '/terms-and-conditions', label: 'Terms' },
		{ href: '/privacy', label: 'Privacy' },
		{ href: '/refund', label: 'Refunds' }
	] as const;

	let { eyebrow, title, description, children }: Props = $props();
</script>

<section class="public-shell">
	<div class="public-backdrop" aria-hidden="true"></div>

	<div class="public-frame">
		<header class="public-header">
			<a class="public-wordmark" href="/" aria-label="ChurnPulse home">
				<svg
					class="public-bolt"
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
				<span>ChurnPulse</span>
			</a>

			<nav class="public-nav" aria-label="Primary">
				{#each legalLinks as link (link.href)}
					<a href={link.href}>{link.label}</a>
				{/each}
			</nav>

			<div class="public-actions">
				<a class="public-button public-button-muted" href="/sign-in">Sign in</a>
				<a class="public-button public-button-primary" href="/sign-up">Start free</a>
			</div>
		</header>

		<main class="public-main">
			<div class="public-hero">
				<p class="public-eyebrow">{eyebrow}</p>
				<h1 class="public-title">{title}</h1>
				<p class="public-description">{description}</p>
			</div>

			<div class="public-content">
				{@render children()}
			</div>
		</main>

		<footer class="public-footer">
			<div>
				<p class="public-footer-brand">ChurnPulse</p>
				<p class="public-footer-copy">
					AI-powered churn prevention for SaaS teams. Pricing, delivery terms, and billing
					policies are published openly for customer and vendor review.
				</p>
			</div>

			<div class="public-footer-links">
				{#each legalLinks as link (link.href)}
					<a href={link.href}>{link.label}</a>
				{/each}
			</div>
		</footer>
	</div>
</section>

<style>
	.public-shell {
		position: relative;
		min-height: 100vh;
		padding: 1.5rem;
		background: var(--bg-base);
		color: var(--text-primary);
	}

	.public-backdrop {
		position: absolute;
		inset: 0;
		pointer-events: none;
		background:
			radial-gradient(circle at top, rgba(0, 229, 255, 0.13), transparent 32%),
			linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 22%);
	}

	.public-frame {
		position: relative;
		z-index: 1;
		margin: 0 auto;
		max-width: 78rem;
	}

	.public-header,
	.public-footer {
		display: grid;
		gap: 1rem;
		border-bottom: 1px solid var(--border-subtle);
		padding: 0.25rem 0 1.25rem;
	}

	.public-header {
		grid-template-columns: 1fr;
		align-items: center;
	}

	.public-wordmark {
		display: inline-flex;
		align-items: center;
		gap: 0.65rem;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.92rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent-cyan);
	}

	.public-bolt {
		width: 1rem;
		height: 1rem;
	}

	.public-nav,
	.public-actions,
	.public-footer-links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.8rem;
	}

	.public-nav a,
	.public-footer-links a {
		font-size: 0.92rem;
		color: var(--text-secondary);
		transition: color 140ms ease;
	}

	.public-nav a:hover,
	.public-footer-links a:hover {
		color: var(--text-primary);
	}

	.public-actions {
		justify-content: flex-start;
	}

	.public-button {
		border: 1px solid var(--border-default);
		padding: 0.78rem 1rem;
		font-size: 0.92rem;
		transition:
			border-color 140ms ease,
			background-color 140ms ease,
			color 140ms ease;
	}

	.public-button-muted:hover {
		border-color: var(--border-accent);
		background: var(--bg-surface);
	}

	.public-button-primary {
		border-color: var(--accent-cyan-border);
		background: var(--accent-cyan-dim);
		color: var(--accent-cyan);
	}

	.public-button-primary:hover {
		background: rgba(0, 229, 255, 0.22);
	}

	.public-main {
		padding: 3rem 0 4rem;
	}

	.public-hero {
		max-width: 50rem;
	}

	.public-eyebrow {
		margin: 0;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: var(--accent-cyan);
	}

	.public-title {
		margin: 1rem 0 0;
		font-family: 'IBM Plex Mono', monospace;
		font-size: clamp(2.4rem, 5vw, 4.8rem);
		line-height: 1.04;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: white;
	}

	.public-description {
		margin: 1.25rem 0 0;
		max-width: 42rem;
		font-size: 1.06rem;
		line-height: 1.8;
		color: var(--text-secondary);
	}

	.public-content {
		margin-top: 2rem;
	}

	.public-footer {
		grid-template-columns: 1fr;
		border-bottom: 0;
		border-top: 1px solid var(--border-subtle);
		padding: 1.25rem 0 0;
	}

	.public-footer-brand,
	.public-footer-copy {
		margin: 0;
	}

	.public-footer-brand {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.82rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.public-footer-copy {
		margin-top: 0.55rem;
		max-width: 42rem;
		font-size: 0.94rem;
		line-height: 1.7;
		color: var(--text-secondary);
	}

	@media (min-width: 860px) {
		.public-header {
			grid-template-columns: auto 1fr auto;
			gap: 1.5rem;
		}

		.public-nav {
			justify-content: center;
		}

		.public-actions {
			justify-content: flex-end;
		}

		.public-footer {
			grid-template-columns: 1fr auto;
			align-items: end;
		}
	}
</style>
