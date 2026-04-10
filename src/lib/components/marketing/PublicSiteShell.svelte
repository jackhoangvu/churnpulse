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
		{ href: '/demo', label: 'Demo' },
		{ href: '/docs', label: 'Docs' },
		{ href: '/changelog', label: 'Changelog' },
		{ href: '/terms-and-conditions', label: 'Terms' },
		{ href: '/privacy', label: 'Privacy' },
		{ href: '/refund', label: 'Refunds' }
	] as const;

	let { eyebrow, title, description, children }: Props = $props();
</script>

<section class="public-page">
	<div class="public-page__frame">
		<header class="landing-nav" id="public-nav">
			<a class="landing-nav__logo" href="/" aria-label="ChurnPulse home">
				<svg
					class="wordmark-bolt text-brand"
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
				<span class="landing-nav__wordmark">Churn<em>Pulse</em></span>
			</a>

			<nav class="landing-nav__links" aria-label="Primary">
				{#each legalLinks as link (link.href)}
					<a class="landing-nav__link" href={link.href}>{link.label}</a>
				{/each}
				<a class="btn btn-secondary btn-sm" href="/sign-in">Sign in</a>
				<a class="btn btn-primary btn-sm" href="/sign-up">Start free</a>
			</nav>
		</header>

		<main class="public-page__main">
			<div class="public-page__hero">
				<p class="public-page__eyebrow">{eyebrow}</p>
				<h1 class="public-page__title">{title}</h1>
				<p class="public-page__description">{description}</p>
			</div>

			<div class="public-page__content">
				{@render children()}
			</div>
		</main>

		<footer class="footer">
			<div class="footer__intro" id="footer-intro">
				<p class="footer__copy" id="footer-copy">© 2026 ChurnPulse. Built for SaaS founders.</p>
				<p class="public-page__description" id="footer-description">
					AI-powered churn prevention for SaaS teams. Pricing, delivery terms, and billing
					policies are published openly for customer and vendor review.
				</p>
			</div>

			<div class="footer__links" id="footer-links">
				{#each legalLinks as link (link.href)}
					<a class="footer__link" href={link.href} id={`footer-link-${link.label.toLowerCase()}`}>
						{link.label}
					</a>
				{/each}
			</div>
		</footer>
	</div>
</section>
