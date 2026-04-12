<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import PublicSiteShell from '$lib/components/marketing/PublicSiteShell.svelte';
	import { trackEvent } from '$lib/analytics';

	type DocSection = {
		id: string;
		label: string;
		items: Array<{ id: string; label: string }>;
	};

	const sections: DocSection[] = [
		{
			id: 'getting-started',
			label: 'Getting Started',
			items: [
				{ id: 'quick-start', label: 'Quick start' },
				{ id: 'how-it-works', label: 'How it works' },
				{ id: 'architecture', label: 'Architecture' }
			]
		},
		{
			id: 'integrations',
			label: 'Integrations',
			items: [
				{ id: 'polar', label: 'Polar' },
				{ id: 'stripe', label: 'Stripe' },
				{ id: 'paddle', label: 'Paddle' },
				{ id: 'lemon-squeezy', label: 'Lemon Squeezy' }
			]
		},
		{
			id: 'signals',
			label: 'Churn Signals',
			items: [
				{ id: 'signal-card-failed', label: 'Card failed' },
				{ id: 'signal-disengaged', label: 'Disengaged' },
				{ id: 'signal-downgraded', label: 'Downgraded' },
				{ id: 'signal-paused', label: 'Paused' },
				{ id: 'signal-cancelled', label: 'Cancelled' },
				{ id: 'signal-high-mrr', label: 'High MRR risk' },
				{ id: 'signal-trial-ending', label: 'Trial ending' }
			]
		},
		{
			id: 'sequences',
			label: 'Sequences',
			items: [
				{ id: 'sequence-overview', label: 'Overview' },
				{ id: 'email-templates', label: 'Email templates' },
				{ id: 'timing', label: 'Timing & steps' }
			]
		},
		{
			id: 'troubleshooting',
			label: 'Troubleshooting',
			items: [
				{ id: 'faq', label: 'FAQ' },
				{ id: 'test-webhooks', label: 'Testing webhooks' }
			]
		}
	];

	let activeSection = $state('quick-start');

	onMount(() => {
		trackEvent('docs_viewed');
		const hash = page.url.hash.replace('#', '');

		if (hash) {
			activeSection = hash;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						activeSection = entry.target.id;
						history.replaceState(null, '', `#${entry.target.id}`);
					}
				}
			},
			{ threshold: 0.4, rootMargin: '-100px 0px -60% 0px' }
		);

		document.querySelectorAll<HTMLElement>('.docs-content h2[id], .docs-content h3[id]').forEach((element) => {
			observer.observe(element);
		});

		return () => observer.disconnect();
	});

	function scrollTo(id: string): void {
		activeSection = id;
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		history.replaceState(null, '', `#${id}`);
		trackEvent('docs_section_viewed', { section: id });
	}
</script>

<svelte:head>
	<title>Documentation - ChurnPulse</title>
	<meta
		name="description"
		content="Complete documentation for ChurnPulse - connect Stripe, Paddle, Lemon Squeezy, and Polar, detect churn signals, and automate win-back sequences."
	/>
</svelte:head>

<PublicSiteShell
	eyebrow="Documentation"
	title="Everything you need to stop churn"
	description="Guides, integration references, and troubleshooting for ChurnPulse - the multi-platform churn prevention tool for SaaS founders."
>
	<div class="docs-layout" id="docs-layout">
		<aside class="docs-sidebar" id="docs-sidebar" aria-label="Documentation navigation">
			{#each sections as section (section.id)}
				<div class="docs-nav__section" id={`docs-nav-${section.id}`}>
					<span class="docs-nav__section-label" id={`docs-nav-label-${section.id}`}>{section.label}</span>
					{#each section.items as item (item.id)}
						<button
							class="docs-nav__link"
							class:docs-nav__link--active={activeSection === item.id}
							type="button"
							id={`docs-nav-link-${item.id}`}
							onclick={() => scrollTo(item.id)}
						>
							{item.label}
						</button>
					{/each}
				</div>
			{/each}
		</aside>

		<article class="docs-content" id="docs-content">
			<h2 class="docs-heading" id="quick-start">Quick start</h2>
			<p class="docs-paragraph" id="docs-quick-start-copy">
				ChurnPulse connects to your customers' billing platforms, watches for churn signals,
				and fires AI-personalized recovery sequences automatically. Setup takes under 5 minutes.
			</p>
			<div class="docs-callout" id="docs-callout-quickstart">
				<strong class="docs-callout__strong" id="docs-callout-quickstart-strong">
					Most accounts see their first detected signal within 24 hours of connecting.
				</strong>
				<span class="docs-callout__copy" id="docs-callout-quickstart-copy">
					Signals only appear when a real billing event occurs - use Settings -> Test
					Webhook to simulate one immediately.
				</span>
			</div>
			<ol class="docs-content__steps" id="docs-quickstart-steps">
				<li class="docs-content__step" id="docs-step-signup">
					Create your ChurnPulse account at <a class="docs-link" href="/sign-up" id="docs-link-signup">/sign-up</a>
				</li>
				<li class="docs-content__step" id="docs-step-connect">
					Connect your billing platform in Settings -> Integrations
				</li>
				<li class="docs-content__step" id="docs-step-watch">
					ChurnPulse starts watching for signals immediately
				</li>
				<li class="docs-content__step" id="docs-step-send">
					When a signal fires, a recovery sequence is scheduled automatically
				</li>
			</ol>

			<h2 class="docs-heading" id="how-it-works">How it works</h2>
			<p class="docs-paragraph" id="docs-how-it-works-copy-1">
				ChurnPulse sits between your billing platform and your customers. When a billing event
				fires - a failed payment, a cancellation, or a plan downgrade - ChurnPulse receives it
				via webhook, classifies the churn risk using Claude AI, and schedules a signal-specific
				recovery sequence.
			</p>
			<p class="docs-paragraph" id="docs-how-it-works-copy-2">
				The entire pipeline from webhook receipt to first recovery email typically completes in
				under 60 seconds. You do not need to write any code to get started.
			</p>

			<h2 class="docs-heading" id="architecture">Architecture</h2>
			<p class="docs-paragraph" id="docs-architecture-copy">
				ChurnPulse is built on SvelteKit 5, Supabase, Clerk for auth, Resend for email delivery,
				Trigger.dev for background jobs, and Anthropic Claude for AI-powered churn classification.
			</p>
			<div class="docs-code" id="docs-arch-flow">
				Billing event -&gt; Webhook endpoint -&gt; Signature verification -&gt; Signal normalization
				-&gt; Churn signal created in DB -&gt; AI classification -&gt; Sequence scheduled -&gt;
				Recovery email sent -&gt; Dashboard updated
			</div>

			<h2 class="docs-heading" id="polar">Polar</h2>
			<p class="docs-paragraph" id="docs-polar-copy">
				Polar uses OAuth, meaning your customers authorize ChurnPulse with a single click.
				ChurnPulse gets read-only access to subscription events through Polar's webhook system.
			</p>
			<h3 class="docs-subheading" id="polar-setup">Setup</h3>
			<ul class="docs-list" id="docs-polar-list">
				<li class="docs-list__item" id="docs-polar-item-1">
					Go to Settings -> Integrations -> Polar -> click "Connect Polar"
				</li>
				<li class="docs-list__item" id="docs-polar-item-2">
					Authorize read-only access on the Polar OAuth screen
				</li>
				<li class="docs-list__item" id="docs-polar-item-3">
					ChurnPulse registers a webhook automatically and starts monitoring
				</li>
			</ul>
			<div class="docs-callout" id="polar-callout">
				<strong class="docs-callout__strong" id="polar-callout-strong">Polar sandbox:</strong>
				<span class="docs-callout__copy" id="polar-callout-copy">
					Set <code class="docs-code">POLAR_SERVER=sandbox</code> to test in Polar's sandbox
					before going live.
				</span>
			</div>

			<h2 class="docs-heading" id="stripe">Stripe</h2>
			<p class="docs-paragraph" id="docs-stripe-copy">
				Stripe uses Connect OAuth, which gives ChurnPulse read-only access to your customers'
				Stripe accounts. Your customers authorize with a single click - no credentials are shared.
			</p>
			<h3 class="docs-subheading" id="stripe-setup">Setup</h3>
			<ul class="docs-list" id="docs-stripe-list">
				<li class="docs-list__item" id="docs-stripe-item-1">
					Set the redirect URI to <code class="docs-code">{'{YOUR_APP_URL}'}/api/stripe/callback</code>
				</li>
				<li class="docs-list__item" id="docs-stripe-item-2">
					Copy your Client ID and add it to <code class="docs-code">STRIPE_CLIENT_ID</code>
				</li>
				<li class="docs-list__item" id="docs-stripe-item-3">
					Go to Settings -> Integrations -> Stripe -> click "Connect Stripe"
				</li>
			</ul>
			<h3 class="docs-subheading" id="stripe-events">Monitored events</h3>
			<ul class="docs-list" id="docs-stripe-events-list">
				<li class="docs-list__item" id="docs-stripe-event-1">
					<code class="docs-code">invoice.payment_failed</code> -> Card failed signal
				</li>
				<li class="docs-list__item" id="docs-stripe-event-2">
					<code class="docs-code">customer.subscription.updated</code> -> Downgrade detection
				</li>
				<li class="docs-list__item" id="docs-stripe-event-3">
					<code class="docs-code">customer.subscription.paused</code> -> Paused signal
				</li>
				<li class="docs-list__item" id="docs-stripe-event-4">
					<code class="docs-code">customer.subscription.deleted</code> -> Cancelled signal
				</li>
				<li class="docs-list__item" id="docs-stripe-event-5">
					<code class="docs-code">customer.subscription.trial_will_end</code> -> Trial ending signal
				</li>
			</ul>

			<h2 class="docs-heading" id="paddle">Paddle</h2>
			<p class="docs-paragraph" id="docs-paddle-copy">
				Paddle uses a webhook-based integration. You point your Paddle notification URL at
				ChurnPulse and add your signing secret. ChurnPulse verifies every signature before processing.
			</p>
			<h3 class="docs-subheading" id="paddle-setup">Setup</h3>
			<ul class="docs-list" id="docs-paddle-list">
				<li class="docs-list__item" id="docs-paddle-item-1">
					Set the URL to <code class="docs-code">{'{YOUR_APP_URL}'}/api/webhooks/paddle</code>
				</li>
				<li class="docs-list__item" id="docs-paddle-item-2">
					Select events: transaction.payment_failed, subscription.updated, subscription.canceled, subscription.trial_end_reminder
				</li>
				<li class="docs-list__item" id="docs-paddle-item-3">
					Copy the signing secret and paste it in Settings -> Integrations -> Paddle
				</li>
			</ul>
			<div class="docs-callout" id="paddle-callout">
				<strong class="docs-callout__strong" id="paddle-callout-strong">Custom data:</strong>
				<span class="docs-callout__copy" id="paddle-callout-copy">
					Pass <code class="docs-code">{'{"org_id": "your-churnpulse-org-id"}'}</code> as
					custom_data in your Paddle checkout to associate events automatically.
				</span>
			</div>

			<h2 class="docs-heading" id="lemon-squeezy">Lemon Squeezy</h2>
			<p class="docs-paragraph" id="docs-ls-copy">
				Lemon Squeezy uses webhook-based integration with HMAC-SHA256 signature verification.
			</p>
			<h3 class="docs-subheading" id="ls-setup">Setup</h3>
			<ul class="docs-list" id="docs-ls-list">
				<li class="docs-list__item" id="docs-ls-item-1">
					Set the URL to <code class="docs-code">{'{YOUR_APP_URL}'}/api/webhooks/lemonsqueezy</code>
				</li>
				<li class="docs-list__item" id="docs-ls-item-2">
					Select events: subscription_payment_failed, subscription_updated, subscription_cancelled, subscription_expired
				</li>
				<li class="docs-list__item" id="docs-ls-item-3">
					Copy the signing secret and paste it in Settings -> Integrations -> Lemon Squeezy
				</li>
			</ul>
			<div class="docs-callout" id="ls-callout">
				<strong class="docs-callout__strong" id="ls-callout-strong">Custom data:</strong>
				<span class="docs-callout__copy" id="ls-callout-copy">
					Pass <code class="docs-code">org_id</code> in Lemon Squeezy checkout metadata to
					associate events with your ChurnPulse workspace.
				</span>
			</div>

			<h2 class="docs-heading" id="signal-card-failed">Card failed</h2>
			<p class="docs-paragraph" id="docs-signal-card-failed-copy">
				Fires when an invoice payment fails. This is involuntary churn - the customer did not
				intend to cancel. Recovery rates for card failures are often the highest because the
				customer still wants the product.
			</p>

			<h2 class="docs-heading" id="signal-disengaged">Disengaged</h2>
			<p class="docs-paragraph" id="docs-signal-disengaged-copy">
				Fires when a customer has not logged in for 14+ days. Silent churn is forming and the
				reactivation window is narrowing.
			</p>

			<h2 class="docs-heading" id="signal-downgraded">Downgraded</h2>
			<p class="docs-paragraph" id="docs-signal-downgraded-copy">
				Fires when a customer's subscription MRR drops by more than 20%. Budget pressure or a
				perceived value gap is usually behind this signal.
			</p>

			<h2 class="docs-heading" id="signal-paused">Paused</h2>
			<p class="docs-paragraph" id="docs-signal-paused-copy">
				Fires when a subscription's billing is paused. Paused is not harmless - a
				reactivation sequence fires before the pause quietly becomes permanent.
			</p>

			<h2 class="docs-heading" id="signal-cancelled">Cancelled</h2>
			<p class="docs-paragraph" id="docs-signal-cancelled-copy">
				Fires immediately on cancellation. A 30-day win-back window opens and the first email
				goes out while the context is still fresh.
			</p>

			<h2 class="docs-heading" id="signal-high-mrr">High MRR risk</h2>
			<p class="docs-paragraph" id="docs-signal-high-mrr-copy">
				Any risk signal on a customer worth $500+/month triggers a critical escalation and an
				immediate internal alert to your configured alert email.
			</p>

			<h2 class="docs-heading" id="signal-trial-ending">Trial ending</h2>
			<p class="docs-paragraph" id="docs-signal-trial-ending-copy">
				Fires when a trial ends within 3 days and the customer has not upgraded. A conversion-focused
				email sequence fires immediately.
			</p>

			<h2 class="docs-heading" id="sequence-overview">Sequences overview</h2>
			<p class="docs-paragraph" id="docs-sequence-overview-copy">
				Every churn signal triggers a pre-configured email sequence. Sequences are scheduled by
				Trigger.dev and delivered via Resend with AI-personalized copy.
			</p>

			<h2 class="docs-heading" id="email-templates">Email templates</h2>
			<p class="docs-paragraph" id="docs-email-templates-copy">
				Templates are viewable at Dashboard -> Sequences -> Templates. Each template is rendered
				in real time with sample data so you can preview exactly what customers receive.
			</p>

			<h2 class="docs-heading" id="timing">Timing and steps</h2>
			<div class="docs-code" id="docs-timing-table">
				card_failed: step 1 = 0h, step 2 = 24h, step 3 = 72h
				disengaged: step 1 = 0h, step 2 = 3d, step 3 = 7d
				cancelled: step 1 = 0h, step 2 = 7d, step 3 = 30d
				downgraded: step 1 = 0h, step 2 = 5d
				paused: step 1 = 7d, step 2 = 14d, step 3 = 21d
				high_mrr_risk: step 1 = 0h
				trial_ending: step 1 = 0h
			</div>

			<h2 class="docs-heading" id="faq">FAQ</h2>
			<h3 class="docs-subheading" id="docs-faq-no-signals">I connected a platform but see no signals</h3>
			<p class="docs-paragraph" id="docs-faq-no-signals-copy">
				Signals only appear when a real billing event occurs. Use Settings -> Test Webhook to
				simulate an <code class="docs-code">invoice.payment_failed</code> event immediately.
			</p>
			<h3 class="docs-subheading" id="docs-faq-domains">Are emails sent from my domain or ChurnPulse?</h3>
			<p class="docs-paragraph" id="docs-faq-domains-copy">
				Emails are currently sent from ChurnPulse's domain via Resend. Custom sending domain
				support is on the roadmap for the Scale plan.
			</p>
			<h3 class="docs-subheading" id="docs-faq-data">What data does ChurnPulse access?</h3>
			<p class="docs-paragraph" id="docs-faq-data-copy">
				ChurnPulse uses read-only OAuth access for Polar and Stripe. For Paddle and Lemon
				Squeezy, only webhook events are received. No payment methods or full card numbers are stored.
			</p>

			<h2 class="docs-heading" id="test-webhooks">Testing webhooks</h2>
			<p class="docs-paragraph" id="docs-test-webhooks-copy">
				Go to Settings -> Polar or Integrations -> click "Test webhook". This fires a synthetic
				<code class="docs-code">invoice.payment_failed</code> event through the full pipeline.
			</p>
			<p class="docs-paragraph" id="docs-tunnel-copy">
				For local development, use Cloudflare Tunnel to expose your local server:
			</p>
			<div class="docs-code" id="docs-tunnel">
				cloudflared tunnel --url http://localhost:5173
				# Then set PUBLIC_APP_URL=https://your-subdomain.trycloudflare.com in .env
			</div>
		</article>
	</div>
</PublicSiteShell>
