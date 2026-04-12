<script lang="ts">
	import { browser } from '$app/environment';
	import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Reveal from '$lib/components/ui/Reveal.svelte';

	type NavLink = {
		href: string;
		label: string;
	};

	type ProofItem = {
		label: string;
	};

	type PreviewRow = {
		customer: string;
		signal: string;
		signalClass: string;
		mrr: string;
		status: string;
		statusClass: string;
	};

	type SignalCard = {
		title: string;
		description: string;
		icon: 'warning' | 'analytics' | 'sparkline' | 'playbooks' | 'recovery' | 'users';
		cardClass: string;
		badgeLabel?: string;
		badgeClass?: string;
	};

	type StepItem = {
		number: string;
		title: string;
		description: string;
		icon: 'plug' | 'bell' | 'mail';
	};

	type PricingPlan = {
		name: string;
		price: string;
		audience: string;
		description: string;
		features: string[];
		ctaLabel: string;
		ctaHref: string;
		featured?: boolean;
		badgeLabel?: string;
	};

	type PlatformChip = {
		name: string;
		color: string;
	};

	const navLinks: NavLink[] = [
		{ href: '#signals', label: 'Risk alerts' },
		{ href: '#how-it-works', label: 'How it works' },
		{ href: '#pricing', label: 'Pricing' },
		{ href: '/docs', label: 'Docs' }
	];

	const proofItems: ProofItem[] = [
		{ label: 'Works with Stripe, Paddle, LS & Polar' },
		{ label: 'First signal detected in under a minute' },
		{ label: 'Read-only billing access — nothing stored' }
	];

	const previewRows: PreviewRow[] = [
		{
			customer: 'Acme Corp',
			signal: 'Card failed',
			signalClass: 'badge-danger',
			mrr: '$890/mo',
			status: 'Urgent',
			statusClass: 'status-dot--sequence_started'
		},
		{
			customer: 'Northstar AI',
			signal: 'Disengaged',
			signalClass: 'badge-warning',
			mrr: '$2,100/mo',
			status: 'Queued',
			statusClass: 'status-dot--detected'
		},
		{
			customer: 'Pylon HQ',
			signal: 'Downgraded',
			signalClass: 'badge-brand',
			mrr: '$340/mo',
			status: 'Monitoring',
			statusClass: 'status-dot--detected'
		},
		{
			customer: 'Cycle App',
			signal: 'High MRR risk',
			signalClass: 'badge-critical',
			mrr: '$4,400/mo',
			status: 'Escalated',
			statusClass: 'status-dot--sequence_started'
		}
	];

	const platformChips: PlatformChip[] = [
		{ name: 'Stripe', color: 'oklch(58% 0.23 276)' },
		{ name: 'Paddle', color: 'oklch(71% 0.15 235)' },
		{ name: 'Lemon Squeezy', color: 'oklch(84% 0.17 91)' },
		{ name: 'Polar', color: 'oklch(55% 0.22 264)' }
	];

	const signalCards: SignalCard[] = [
		{
			title: 'Card Failed',
			description:
				'A failed charge is not churn — it is a timing issue. ChurnPulse catches every declined invoice the moment it happens and fires a recovery email before the customer even notices the lapse.',
			icon: 'warning',
			cardClass: 'signal-card--card-failed'
		},
		{
			title: 'Disengaged',
			description:
				'Fourteen days of silence is early-stage churn, not just inactivity. We surface the exact moment usage drops below the recovery threshold and start re-engagement before the account quietly disappears.',
			icon: 'analytics',
			cardClass: 'signal-card--disengaged'
		},
		{
			title: 'Downgraded',
			description:
				'A 20%+ plan drop is a budget signal, not a retention win. ChurnPulse flags the revenue reduction immediately and opens a value-reinforcement sequence while there is still room to grow back.',
			icon: 'sparkline',
			cardClass: 'signal-card--downgraded'
		},
		{
			title: 'Paused',
			description:
				'Paused subscriptions become cancellations 60% of the time without proactive outreach. We close that gap with a timed reactivation sequence that does not feel desperate.',
			icon: 'playbooks',
			cardClass: 'signal-card--paused'
		},
		{
			title: 'Cancelled',
			description:
				'The 30-day win-back window starts the moment they cancel. ChurnPulse gets the first message out within the hour, while your product is still top of mind.',
			icon: 'recovery',
			cardClass: 'signal-card--cancelled'
		},
		{
			title: 'High MRR Risk',
			description:
				'An enterprise account showing any risk signal gets an immediate escalation — internal alert to your team and a personalized outreach sequence within minutes, not hours.',
			icon: 'users',
			cardClass: 'signal-card--high-mrr',
			badgeLabel: 'Critical',
			badgeClass: 'badge-critical'
		}
	];

	const stepItems: StepItem[] = [
		{
			number: '01',
			title: 'Connect in 60 seconds',
			description:
				'OAuth or webhook. No code, no API keys in your codebase. ChurnPulse gets read-only access and starts monitoring the second you authorize.',
			icon: 'plug'
		},
		{
			number: '02',
			title: 'Every risk event, captured instantly',
			description:
				'Webhooks hit our endpoint the moment billing changes. We classify the signal, score the urgency, and add it to your recovery queue — all before you have seen the notification.',
			icon: 'bell'
		},
		{
			number: '03',
			title: 'Recovery runs without you',
			description:
				'Signal-specific sequences fire automatically with copy personalized to the customer value, churn reason, and trigger event. You intervene when it matters, ignore the rest.',
			icon: 'mail'
		}
	];

	const pricingPlans: PricingPlan[] = [
		{
			name: 'Starter',
			price: '$29',
			audience: 'Early-stage SaaS under $10K MRR',
			description:
				'Everything you need to catch the obvious losses. Core churn detection, automated recovery sequences, and a dashboard that makes the problem impossible to ignore.',
			features: [
				'3 core churn alerts',
				'Automated 3-step recovery sequences',
				'One billing platform connection',
				'30-day dashboard history',
				'Up to 500 monitored accounts',
				'Email support'
			],
			ctaLabel: 'Start recovery →',
			ctaHref: '/sign-up'
		},
		{
			name: 'Growth',
			price: '$49',
			audience: 'The plan most founders stay on',
			description:
				'All seven signals, AI-personalized emails, and a recovery system that is paid for itself by the second account it saves. The plan most founders stay on permanently.',
			features: [
				'All 7 churn alerts',
				'AI-personalized win-back emails',
				'Real-time queue and dashboard',
				'Unlimited monitored accounts',
				'High-MRR escalation alerts',
				'Sequence analytics',
				'Priority support'
			],
			ctaLabel: 'Start free trial →',
			ctaHref: '/sign-up',
			featured: true,
			badgeLabel: 'Most popular'
		},
		{
			name: 'Scale',
			price: '$99',
			audience: 'High-value SaaS teams with layered saves',
			description:
				'When a single recovered enterprise account covers the cost for the year, this stops being a cost decision and becomes a process one.',
			features: [
				'Everything in Growth',
				'Custom sending domain',
				'Webhook exports',
				'Advanced sequence branching',
				'Internal team alerts',
				'CSV exports',
				'Dedicated support channel'
			],
			ctaLabel: 'Talk to sales →',
			ctaHref: '/docs'
		}
	];

	let landingElement = $state<HTMLElement | null>(null);
	let isScrolled = $state(false);

	function updateScrollState(): void {
		isScrolled = window.scrollY > 60;
	}

	$effect(() => {
		if (!browser || !landingElement) {
			return;
		}

		const cleanupCallbacks: Array<() => void> = [];
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		const anchorLinks = landingElement.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
		const tiltCards = landingElement.querySelectorAll<HTMLElement>('.js-tilt');

		updateScrollState();

		const handleScroll = (): void => {
			updateScrollState();
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		cleanupCallbacks.push(() => window.removeEventListener('scroll', handleScroll));

		const handleAnchorClick = (event: MouseEvent): void => {
			const currentTarget = event.currentTarget;

			if (!(currentTarget instanceof HTMLAnchorElement)) {
				return;
			}

			const href = currentTarget.getAttribute('href');

			if (!href?.startsWith('#')) {
				return;
			}

			const target = landingElement?.querySelector<HTMLElement>(href);

			if (!target) {
				return;
			}

			event.preventDefault();
			target.scrollIntoView({
				behavior: prefersReducedMotion ? 'auto' : 'smooth',
				block: 'start'
			});
			window.history.replaceState(null, '', href);
		};

		for (const anchorLink of anchorLinks) {
			anchorLink.addEventListener('click', handleAnchorClick);
			cleanupCallbacks.push(() => anchorLink.removeEventListener('click', handleAnchorClick));
		}

		if (!prefersReducedMotion) {
			for (const tiltCard of tiltCards) {
				const handleMouseMove = (event: MouseEvent): void => {
					const bounds = tiltCard.getBoundingClientRect();
					const horizontalRatio = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
					const verticalRatio = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
					const rotateY = horizontalRatio * 7;
					const rotateX = verticalRatio * -7;
					const mouseX = ((event.clientX - bounds.left) / bounds.width) * 100;
					const mouseY = ((event.clientY - bounds.top) / bounds.height) * 100;

					tiltCard.style.setProperty('--tilt-rotate-x', `${rotateX.toFixed(2)}deg`);
					tiltCard.style.setProperty('--tilt-rotate-y', `${rotateY.toFixed(2)}deg`);
					tiltCard.style.setProperty('--tilt-mx', `${mouseX.toFixed(2)}%`);
					tiltCard.style.setProperty('--tilt-my', `${mouseY.toFixed(2)}%`);
				};

				const handleMouseLeave = (): void => {
					tiltCard.style.setProperty('--tilt-rotate-x', '0deg');
					tiltCard.style.setProperty('--tilt-rotate-y', '0deg');
					tiltCard.style.setProperty('--tilt-mx', '50%');
					tiltCard.style.setProperty('--tilt-my', '50%');
				};

				handleMouseLeave();
				tiltCard.addEventListener('mousemove', handleMouseMove);
				tiltCard.addEventListener('mouseleave', handleMouseLeave);

				cleanupCallbacks.push(() => {
					tiltCard.removeEventListener('mousemove', handleMouseMove);
					tiltCard.removeEventListener('mouseleave', handleMouseLeave);
				});
			}
		}

		return () => {
			for (const cleanupCallback of cleanupCallbacks) {
				cleanupCallback();
			}
		};
	});
</script>

<svelte:head>
	<title>ChurnPulse — Recover customers before they&apos;re gone</title>
	<meta
		name="description"
		content="ChurnPulse monitors every billing event across Stripe, Paddle, Lemon Squeezy, and Polar so SaaS teams can launch personalized recovery sequences before churn becomes lost revenue."
	/>
</svelte:head>

<main bind:this={landingElement} id="landing" class="landing-page text-primary">
	<header class="landing-nav" class:landing-nav--scrolled={isScrolled}>
		<a class="landing-nav__logo" href="/" aria-label="ChurnPulse home">
			<span class="landing-nav__logo-mark" aria-hidden="true">
				<Icon name="bolt" size={18} />
			</span>
			<span class="landing-nav__wordmark">
				Churn<em>Pulse</em>
			</span>
		</a>

		<nav class="landing-nav__links" aria-label="Primary">
			{#each navLinks as navLink}
				<a class="landing-nav__link" href={navLink.href}>{navLink.label}</a>
			{/each}
		</nav>

		<div class="landing-nav__actions">
			<ThemeToggle />
			<a class="btn btn-secondary btn-sm" href="/sign-in">Sign in</a>
			<a class="btn btn-primary btn-sm" href="/sign-up">Start free →</a>
		</div>
	</header>

	<section class="hero" id="hero">
		<div class="hero__glow" aria-hidden="true"></div>
		<div class="hero__glow-2" aria-hidden="true"></div>

		<div class="hero__content">
			<p class="hero__eyebrow">Built for SaaS teams bleeding revenue to silent churn</p>

			<h1 class="hero__title">
				Recover customers
				<br />
				before they&apos;re <span class="hero__title--accent">gone</span>
			</h1>

			<p class="hero__subtitle">
				ChurnPulse monitors every billing event across Stripe, Paddle, Lemon Squeezy, and
				Polar. The moment a customer shows risk — failed payment, cancellation, silence — a
				personalized recovery sequence fires automatically. Most teams recover their first
				account within 24 hours.
			</p>

			<div class="hero__ctas">
				<a class="btn btn-primary btn-lg" href="/sign-up">
					Start recovery
					<Icon class="hero__cta-icon" name="arrow-right" size={14} />
				</a>
				<a class="btn btn-ghost btn-lg" href="/demo">Watch the demo</a>
			</div>

			<div class="hero__social-proof" aria-label="Product proof points">
				{#each proofItems as proofItem}
					<div class="hero__proof-item">
						<Icon class="text-brand" name="check" size={14} />
						<span class="font-mono">{proofItem.label}</span>
					</div>
				{/each}
			</div>

			<div class="hero__mockup js-tilt">
				<div class="hero__mockup-inner">
					<div class="hero__mockup-header">
						<div>
							<p class="label">Live recovery queue</p>
							<h2 class="hero__mockup-title">$7,730 at risk across 4 accounts</h2>
						</div>
						<div class="hero__proof-item hero__proof-item--live">
							<span class="status-dot status-dot--detected" aria-hidden="true">
								<span class="status-dot__core"></span>
							</span>
							<span class="font-mono">Recovery running</span>
						</div>
					</div>

					<div class="hero__mockup-metrics">
						<div class="hero__metric-card">
							<p class="label">First touch</p>
							<strong>&lt; 60s</strong>
						</div>
						<div class="hero__metric-card">
							<p class="label">Read-only</p>
							<strong>OAuth access</strong>
						</div>
						<div class="hero__metric-card">
							<p class="label">Channels</p>
							<strong>Stripe + Polar</strong>
						</div>
					</div>

					<div class="hero__mockup-scroll table-container--overflow">
						<table class="table">
							<caption class="sr-only">Sample recovery queue preview</caption>
							<thead class="table__head">
								<tr class="table__head-row">
									<th class="table__heading">Account</th>
									<th class="table__heading">Alert</th>
									<th class="table__heading">Monthly value</th>
									<th class="table__heading">Status</th>
								</tr>
							</thead>
							<tbody class="table__body">
								{#each previewRows as previewRow}
									<tr class="table__row">
										<td class="table__cell">
											<div class="table-customer">
												<div class="table-customer__name">{previewRow.customer}</div>
												<div class="table-customer__meta">Recovery launched automatically</div>
											</div>
										</td>
										<td class="table__cell">
											<span class={`badge ${previewRow.signalClass}`}>{previewRow.signal}</span>
										</td>
										<td class="table__cell">
											<span class="font-mono table-mrr">{previewRow.mrr}</span>
										</td>
										<td class="table__cell">
											<div class="dashboard-overview__status">
												<span class={`status-dot ${previewRow.statusClass}`} aria-hidden="true">
													<span class="status-dot__core"></span>
												</span>
												<span class="dashboard-overview__status-label">{previewRow.status}</span>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	</section>

	<Reveal>
		<section class="section platforms-section" id="platforms">
			<span class="section__label">Connected in minutes</span>
			<h2 class="section__heading">Your billing stack stays exactly where it is.</h2>
			<p class="section__subtitle">
				Connect the providers you already run. ChurnPulse listens to the events, scores the
				urgency, and launches the right save flow without pushing risky write access into your
				billing data.
			</p>

			<div class="platforms-grid">
				{#each platformChips as platform}
					<div class="platform-chip" style={`--chip-color:${platform.color}`}>
						<span class="platform-chip__dot" aria-hidden="true"></span>
						<span class="platform-chip__name">{platform.name}</span>
					</div>
				{/each}
			</div>
		</section>
	</Reveal>

	<section class="section" id="signals">
		<Reveal>
			<div>
				<span class="section__label">What we catch</span>
				<h2 class="section__heading">Seven ways churn starts. One system watching all of them.</h2>
				<p class="section__subtitle">
					These alerts map to the exact moments revenue starts leaking. ChurnPulse turns each
					one into a specific recovery response while there is still time to save the account.
				</p>
			</div>
		</Reveal>

		<div class="grid-3">
			{#each signalCards as signalCard, index}
				<Reveal stagger={index}>
					<article class={`signal-card ${signalCard.cardClass} js-tilt`}>
						<div class="signal-card__header">
							<div class="signal-card__icon">
								<Icon name={signalCard.icon} size={16} />
							</div>

							{#if signalCard.badgeLabel && signalCard.badgeClass}
								<span class={`badge ${signalCard.badgeClass}`}>{signalCard.badgeLabel}</span>
							{/if}
						</div>

						<h3 class="signal-card__name">{signalCard.title}</h3>
						<p class="signal-card__desc">{signalCard.description}</p>
						<p class="signal-card__auto">Recovery emails launch automatically</p>
					</article>
				</Reveal>
			{/each}
		</div>
	</section>

	<section class="section" id="how-it-works">
		<Reveal>
			<div>
				<span class="section__label">How it works</span>
				<h2 class="section__heading">Three steps between risk and recovery.</h2>
				<p class="section__subtitle">
					There is no new workflow to learn. Connect the provider, let the alerts land, and
					intervene only when the account is worth personal attention.
				</p>
			</div>
		</Reveal>

		<div class="steps-grid">
			{#each stepItems as stepItem, index}
				<Reveal stagger={index}>
					<article class="step">
						<p class="step__number">{stepItem.number}</p>
						<div class="step__icon">
							<Icon name={stepItem.icon} size={18} />
						</div>
						<h3 class="step__title">{stepItem.title}</h3>
						<p class="step__desc">{stepItem.description}</p>
					</article>
				</Reveal>
			{/each}
		</div>
	</section>

	<section class="section" id="pricing">
		<Reveal>
			<div>
				<span class="section__label">Pricing</span>
				<h2 class="section__heading">Pick the stage you are in. Keep the revenue you already earned.</h2>
				<p class="section__subtitle">
					Start with the recovery loop you need now. Upgrade only when the queue, the team, or
					the account values make it obvious.
				</p>
			</div>
		</Reveal>

		<div class="pricing-grid">
			{#each pricingPlans as pricingPlan, index}
				<Reveal stagger={index}>
					<article class={`pricing-card js-tilt ${pricingPlan.featured ? 'pricing-card--featured' : ''}`}>
						{#if pricingPlan.badgeLabel}
							<div class="pricing-card__badge">
								<span class="badge badge-brand">{pricingPlan.badgeLabel}</span>
							</div>
						{/if}

						<p class="pricing-card__plan">{pricingPlan.name}</p>
						<div class="pricing-card__price">
							<span class="pricing-card__amount">{pricingPlan.price}</span>
							<span class="pricing-card__period">/month</span>
						</div>
						<p class="pricing-card__desc">{pricingPlan.audience}</p>
						<div class="pricing-card__divider"></div>
						<p class="pricing-card__description">{pricingPlan.description}</p>

						<ul class="pricing-card__features">
							{#each pricingPlan.features as feature}
								<li class="pricing-card__feature">
									<Icon class="pricing-card__feature-icon" name="check" size={14} />
									<span>{feature}</span>
								</li>
							{/each}
						</ul>

						<a
							class={`btn ${pricingPlan.featured ? 'btn-primary' : 'btn-secondary'} btn-full`}
							href={pricingPlan.ctaHref}
						>
							{pricingPlan.ctaLabel}
						</a>
					</article>
				</Reveal>
			{/each}
		</div>
	</section>

	<footer class="footer">
		<div class="footer__status">
			<span class="status-dot status-dot--recovered" aria-hidden="true">
				<span class="status-dot__core"></span>
			</span>
			<span>Billing access stays read-only. Recovery starts in minutes.</span>
		</div>
		<nav class="footer__links" aria-label="Footer">
			<a class="footer__link" href="/privacy">Privacy</a>
			<a class="footer__link" href="/terms-and-conditions">Terms</a>
			<a class="footer__link" href="/changelog">Changelog</a>
			<a class="footer__link" href="/docs">Docs</a>
		</nav>
	</footer>
</main>
