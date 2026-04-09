<script lang="ts">
	type NavLink = {
		href: string;
		label: string;
	};

	type SocialProofItem = {
		label: string;
	};

	type PreviewRow = {
		customer: string;
		signal: string;
		signalClass: string;
		mrr: string;
		badgeLabel: string;
		badgeClass: string;
		statusClass?: string;
	};

	type SignalCard = {
		title: string;
		description: string;
		color: string;
		badgeLabel?: string;
		badgeClass?: string;
		revealDelay: string;
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

	const navLinks: NavLink[] = [
		{ href: '#signals', label: 'Signals' },
		{ href: '#pricing', label: 'Pricing' },
		{ href: '#how-it-works', label: 'Demo' },
		{ href: '/docs', label: 'Docs' }
	];

	const socialProofItems: SocialProofItem[] = [
		{ label: 'No credit card needed' },
		{ label: '60-second setup' },
		{ label: 'Read-only Stripe access' }
	];

	const previewRows: PreviewRow[] = [
		{
			customer: 'Acme Corp',
			signal: 'Card Failed',
			signalClass: 'badge-signal-card-failed',
			mrr: '$890/mo',
			badgeLabel: 'Urgent',
			badgeClass: 'badge-danger',
			statusClass: 'status-dot--detected'
		},
		{
			customer: 'Loom AI',
			signal: 'Disengaged',
			signalClass: 'badge-signal-disengaged',
			mrr: '$2,100/mo',
			badgeLabel: 'Seq. 2/3',
			badgeClass: 'badge-brand'
		},
		{
			customer: 'Pylon HQ',
			signal: 'Downgraded',
			signalClass: 'badge-signal-downgraded',
			mrr: '$340/mo',
			badgeLabel: 'Detected',
			badgeClass: 'badge-muted'
		},
		{
			customer: 'Cycle App',
			signal: 'High MRR',
			signalClass: 'badge-signal-high-mrr',
			mrr: '$4,400/mo',
			badgeLabel: 'CRITICAL',
			badgeClass: 'badge-critical'
		},
		{
			customer: 'Raycast',
			signal: 'Cancelled',
			signalClass: 'badge-signal-cancelled',
			mrr: '$1,200/mo',
			badgeLabel: 'Recovered',
			badgeClass: 'badge-success'
		}
	];

	const signalCards: SignalCard[] = [
		{
			title: 'Card Failed',
			description:
				"Invoice payment failed and the customer probably did not mean to leave. Recover the easy wins before finance becomes churn.",
			color: '#F05252',
			revealDelay: 'reveal-delay-1'
		},
		{
			title: 'Disengaged',
			description:
				'No meaningful product usage in 14+ days. Silent churn is already forming and your reactivation window is narrowing.',
			color: '#F59E0B',
			revealDelay: 'reveal-delay-2'
		},
		{
			title: 'Plan Downgraded',
			description:
				'Subscription value dropped. The account is shrinking, budgets are tightening, and value needs to be re-established fast.',
			color: '#FB923C',
			revealDelay: 'reveal-delay-3'
		},
		{
			title: 'Subscription Paused',
			description:
				'Paused is not harmless. ChurnPulse starts the follow-up window before a pause quietly turns permanent.',
			color: '#818CF8',
			revealDelay: 'reveal-delay-4'
		},
		{
			title: 'Subscription Cancelled',
			description:
				'Cancellation starts a 30-day win-back race. The first touch goes out immediately while the context is still fresh.',
			color: '#EF4444',
			revealDelay: 'reveal-delay-2'
		},
		{
			title: 'High MRR at Risk',
			description:
				'Any risk event on a $500+/mo customer gets escalated instantly so the most expensive losses never hide in the queue.',
			color: '#FF2D55',
			badgeLabel: 'Critical',
			badgeClass: 'badge-critical',
			revealDelay: 'reveal-delay-3'
		}
	];

	const stepItems: StepItem[] = [
		{
			number: '01',
			title: 'Connect Stripe',
			description:
				'OAuth setup takes under a minute. Founders connect once and ChurnPulse starts monitoring the account immediately.',
			icon: 'plug'
		},
		{
			number: '02',
			title: 'Detect Signals',
			description:
				'Webhook events are watched continuously. Every signal is classified, timestamped, and surfaced while the account is still recoverable.',
			icon: 'bell'
		},
		{
			number: '03',
			title: 'Stop Churn',
			description:
				'Signal-aware sequences send automatically with AI-personalized copy tuned to customer value, urgency, and churn reason.',
			icon: 'mail'
		}
	];

	const pricingPlans: PricingPlan[] = [
		{
			name: 'Starter',
			price: '$29',
			audience: 'Early-stage SaaS under $10K MRR',
			description:
				'Catch the obvious churn before it costs you. Core detection, clean workflows, and nothing unnecessary.',
			features: [
				'3 signal types (card failed, cancelled, paused)',
				'Basic email sequences (3-step)',
				'Stripe Connect (read-only)',
				'Dashboard with 30-day history',
				'Up to 500 monitored customers',
				'Email support'
			],
			ctaLabel: 'Get started',
			ctaHref: '/sign-up'
		},
		{
			name: 'Growth',
			price: '$49',
			audience: 'The plan most founders live on',
			description:
				'All 6 signals, AI win-back copy, and a recovery loop that pays for itself as soon as the first account comes back.',
			features: [
				'All 6 signal types',
				'AI-powered email personalization',
				'Real-time dashboard + live signals',
				'Full 3-step sequence engine',
				'Unlimited monitored customers',
				'High MRR priority alerts',
				'Sequence analytics',
				'Priority email support'
			],
			ctaLabel: 'Start free trial',
			ctaHref: '/sign-up',
			featured: true,
			badgeLabel: 'Most popular'
		},
		{
			name: 'Scale',
			price: '$99',
			audience: 'High-MRR teams where one save pays for months',
			description:
				'When one recovered account covers the cost of the tool for the rest of the year, the decision becomes operational, not philosophical.',
			features: [
				'Everything in Growth',
				'Custom email sending domain',
				'Webhook delivery to your own endpoint',
				'Advanced sequence branching',
				'Internal Slack/email alerts',
				'CSV export of all signals',
				'Quarterly strategy call',
				'Dedicated support channel'
			],
			ctaLabel: 'Talk to us',
			ctaHref: '/docs'
		}
	];

	let isScrolled = $state(false);

	function updateScrollState(): void {
		isScrolled = window.scrollY > 20;
	}

	function revealAll(elements: NodeListOf<HTMLElement>): void {
		elements.forEach((element) => {
			element.classList.add('revealed');
		});
	}

	function buildStepIconPath(icon: StepItem['icon']): string[] {
		if (icon === 'plug') {
			return ['M8 4v6', 'M16 4v6', 'M7 10h10v3a5 5 0 0 1-5 5v2'];
		}

		if (icon === 'bell') {
			return ['M12 20a2.5 2.5 0 0 0 2.3-1.5', 'M6 9a6 6 0 1 1 12 0c0 4 2 5 2 5H4s2-1 2-5'];
		}

		return ['M4 7h16v10H4z', 'm4 10 4 3 8-6'];
	}

	$effect(() => {
		if (typeof window === 'undefined' || typeof document === 'undefined') {
			return;
		}

		updateScrollState();

		const cleanupCallbacks: Array<() => void> = [];
		const revealElements = document.querySelectorAll<HTMLElement>('.reveal');
		const anchorLinks = document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
		const tiltCards = document.querySelectorAll<HTMLElement>('.tilt-card');
		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		const handleScroll = (): void => {
			updateScrollState();
		};

		window.addEventListener('scroll', handleScroll, { passive: true });
		cleanupCallbacks.push(() => {
			window.removeEventListener('scroll', handleScroll);
		});

		if (prefersReducedMotion) {
			revealAll(revealElements);
		} else {
			const observer = new IntersectionObserver(
				(entries) => {
					entries.forEach((entry) => {
						if (entry.isIntersecting) {
							entry.target.classList.add('revealed');
							observer.unobserve(entry.target);
						}
					});
				},
				{ threshold: 0.12, rootMargin: '0px 0px -10% 0px' }
			);

			revealElements.forEach((element) => {
				observer.observe(element);
			});

			cleanupCallbacks.push(() => {
				observer.disconnect();
			});
		}

		const handleAnchorClick = (event: MouseEvent): void => {
			const currentTarget = event.currentTarget;
			if (!(currentTarget instanceof HTMLAnchorElement)) {
				return;
			}

			const href = currentTarget.getAttribute('href');
			if (!href || !href.startsWith('#')) {
				return;
			}

			const target = document.querySelector<HTMLElement>(href);
			if (!target) {
				return;
			}

			event.preventDefault();
			target.scrollIntoView({ behavior: 'smooth', block: 'start' });
			window.history.replaceState(null, '', href);
		};

		anchorLinks.forEach((anchorLink) => {
			anchorLink.addEventListener('click', handleAnchorClick);
			cleanupCallbacks.push(() => {
				anchorLink.removeEventListener('click', handleAnchorClick);
			});
		});

		if (!prefersReducedMotion) {
			tiltCards.forEach((tiltCard) => {
				const handleMouseMove = (event: MouseEvent): void => {
					const bounds = tiltCard.getBoundingClientRect();
					const horizontalRatio = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
					const verticalRatio = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
					const rotateY = horizontalRatio * 8;
					const rotateX = verticalRatio * -8;

					tiltCard.style.transform =
						`perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
				};

				const handleMouseLeave = (): void => {
					tiltCard.style.transform = 'none';
				};

				tiltCard.addEventListener('mousemove', handleMouseMove);
				tiltCard.addEventListener('mouseleave', handleMouseLeave);

				cleanupCallbacks.push(() => {
					tiltCard.removeEventListener('mousemove', handleMouseMove);
					tiltCard.removeEventListener('mouseleave', handleMouseLeave);
					tiltCard.style.transform = 'none';
				});
			});
		}

		return () => {
			cleanupCallbacks.forEach((cleanupCallback) => {
				cleanupCallback();
			});
		};
	});
</script>

<svelte:head>
	<title>ChurnPulse — Stop SaaS Churn Before It Happens</title>
	<meta
		name="description"
		content="ChurnPulse helps SaaS founders detect churn signals inside Stripe, trigger AI-personalized win-back sequences, and recover revenue before customers leave."
	/>
</svelte:head>

<main id="landing" class="text-primary">
	<header class="landing-nav" class:landing-nav--scrolled={isScrolled} id="top">
		<a class="landing-nav__logo" href="/" aria-label="ChurnPulse home">
			<svg
				class="text-brand"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path class="text-brand" d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
			</svg>
			<span class="landing-nav__wordmark">
				Churn<em class="text-brand">Pulse</em>
			</span>
		</a>

		<nav class="landing-nav__links" aria-label="Primary">
			{#each navLinks as navLink (navLink.label)}
				<a class="landing-nav__link" href={navLink.href}>{navLink.label}</a>
			{/each}
			<a class="btn btn-secondary btn-sm" href="/sign-in">Sign in</a>
			<a class="btn btn-primary btn-sm" href="/sign-up">Start free →</a>
		</nav>
	</header>

	<section class="hero" id="hero">
		<div class="hero__glow" aria-hidden="true"></div>
		<div class="hero__glow-2" aria-hidden="true"></div>

		<div class="hero__content" id="hero-content">
			<p class="hero__eyebrow">Stripe-native churn prevention</p>

			<h1 class="hero__title">
				Stop losing customers
				<br class="text-primary" />
				you could have <span class="hero__title--accent">saved</span>
			</h1>

			<p class="hero__subtitle">
				ChurnPulse connects to Stripe in 60 seconds and automatically detects 6 churn signals
				including card failures, disengagement, and downgrades, then fires personalized
				win-back emails before customers cancel.
			</p>

			<div class="hero__ctas" id="hero-actions">
				<a class="btn btn-primary btn-lg" href="/sign-up">Connect Stripe — free</a>
				<a class="btn btn-ghost btn-lg" href="#how-it-works">See how it works ↓</a>
			</div>

			<div class="hero__social-proof" id="hero-proof">
				{#each socialProofItems as socialProofItem (socialProofItem.label)}
					<div class="hero__proof-item">
						<svg
							class="text-brand"
							viewBox="0 0 14 14"
							fill="none"
							stroke="currentColor"
							stroke-width="1.7"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path class="text-brand" d="m2.5 7.5 2.5 2.5 6-6" />
						</svg>
						<span class="font-mono">{socialProofItem.label}</span>
					</div>
				{/each}
			</div>

			<div class="hero__mockup" id="hero-mockup">
				<div class="hero__mockup-inner" id="hero-mockup-inner">
					<article class="card card-brand" id="dashboard-preview">
						<div class="hero__social-proof" id="dashboard-preview-header">
							<div id="dashboard-preview-title">
								<p class="label">AT-RISK CUSTOMERS</p>
							</div>
							<div class="hero__proof-item" id="dashboard-preview-live">
								<span class="status-dot status-dot--detected" aria-hidden="true"></span>
								<span class="font-mono">Live</span>
							</div>
						</div>

						<table class="table" id="dashboard-preview-table">
							<thead class="table__head">
								<tr class="table__body">
									<th class="font-mono">Customer</th>
									<th class="font-mono">Signal</th>
									<th class="font-mono">MRR</th>
									<th class="font-mono">Status</th>
								</tr>
							</thead>
							<tbody class="table__body">
								{#each previewRows as previewRow, index (previewRow.customer)}
									<tr
										class={`reveal ${index === 0 ? 'revealed' : ''} ${index === 0 ? 'reveal-delay-1' : index === 1 ? 'reveal-delay-2' : index === 2 ? 'reveal-delay-3' : index === 3 ? 'reveal-delay-4' : 'reveal-delay-4'}`}
									>
										<td class="text-primary">
											<div class="hero__proof-item" id={`preview-customer-${index + 1}`}>
												{#if previewRow.statusClass}
													<span class={`status-dot ${previewRow.statusClass}`} aria-hidden="true"></span>
												{/if}
												<span class="text-primary">{previewRow.customer}</span>
											</div>
										</td>
										<td class="text-primary">
											<span class={`badge ${previewRow.signalClass}`}>{previewRow.signal}</span>
										</td>
										<td class="font-mono text-primary">{previewRow.mrr}</td>
										<td class="text-primary">
											<span class={`badge ${previewRow.badgeClass}`}>{previewRow.badgeLabel}</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</article>
				</div>
			</div>
		</div>
	</section>

	<section class="section reveal" id="signals">
		<span class="section__label">What we detect</span>
		<h2 class="section__heading">6 signals. Zero missed churn.</h2>
		<p class="section__subtitle">
			Every signal maps to a specific failure mode inside a subscription business. ChurnPulse
			watches for all of them continuously so recovery starts before the cancellation email does.
		</p>

		<div class="grid-3" id="signals-grid">
			{#each signalCards as signalCard (signalCard.title)}
				<article
					class={`signal-card tilt-card reveal ${signalCard.revealDelay}`}
					style={`--signal-color: ${signalCard.color}`}
				>
					{#if signalCard.badgeLabel && signalCard.badgeClass}
						<div class="pricing-card__badge" id={`signal-badge-${signalCard.title}`}>
							<span class={`badge ${signalCard.badgeClass}`}>{signalCard.badgeLabel}</span>
						</div>
					{/if}
					<h3 class="signal-card__name">{signalCard.title}</h3>
					<p class="signal-card__desc">{signalCard.description}</p>
					<p class="signal-card__auto">Fires automatically</p>
				</article>
			{/each}
		</div>
	</section>

	<section class="section reveal" id="how-it-works">
		<span class="section__label">How it works</span>
		<h2 class="section__heading">The recovery loop, end to end.</h2>
		<p class="section__subtitle">
			Connect once, let the system watch continuously, and intervene with signal-specific
			sequences while the account is still salvageable.
		</p>

		<div class="steps-grid" id="steps-grid">
			{#each stepItems as stepItem, index (stepItem.number)}
				<article class={`step reveal ${index === 0 ? 'reveal-delay-1' : index === 1 ? 'reveal-delay-2' : 'reveal-delay-3'}`}>
					<div class="step__icon">
						<svg
							class="text-brand"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							{#each buildStepIconPath(stepItem.icon) as stepIconPath (stepIconPath)}
								<path class="text-brand" d={stepIconPath}></path>
							{/each}
						</svg>
					</div>
					<div class="step__number">{stepItem.number}</div>
					<h3 class="step__title">{stepItem.title}</h3>
					<p class="step__desc">{stepItem.description}</p>
				</article>

				{#if index < stepItems.length - 1}
					<div class="step-connector" aria-hidden="true">
						<svg
							class="text-muted"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path class="text-muted" d="M4 12h16" />
							<path class="text-muted" d="m14 6 6 6-6 6" />
						</svg>
					</div>
				{/if}
			{/each}
		</div>
	</section>

	<section class="section reveal" id="pricing">
		<span class="section__label">Simple pricing</span>
		<h2 class="section__heading">One plan shape. Three stages of urgency.</h2>
		<p class="section__subtitle">
			Choose the depth that matches your customer base today. Upgrade when churn becomes a board
			question instead of a founder instinct.
		</p>

		<div class="pricing-grid" id="pricing-grid">
			{#each pricingPlans as pricingPlan, index (pricingPlan.name)}
				<article
					class={`pricing-card ${pricingPlan.featured ? 'pricing-card--featured' : ''} tilt-card reveal ${index === 0 ? 'reveal-delay-1' : index === 1 ? 'reveal-delay-2' : 'reveal-delay-3'}`}
				>
					{#if pricingPlan.badgeLabel}
						<div class="pricing-card__badge">
							<span class="badge badge-brand">{pricingPlan.badgeLabel}</span>
						</div>
					{/if}

					<p class="pricing-card__plan">{pricingPlan.name}</p>

					<div class="pricing-card__price">
						<span class="pricing-card__amount">{pricingPlan.price}</span>
						<span class="pricing-card__period">/mo</span>
					</div>

					<p class="text-muted">{pricingPlan.audience}</p>
					<div class="pricing-card__divider"></div>
					<p class="pricing-card__description">{pricingPlan.description}</p>

					<ul class="pricing-card__features">
						{#each pricingPlan.features as pricingFeature (pricingFeature)}
							<li class="pricing-card__feature">
								<svg
									class="pricing-card__feature-icon"
									viewBox="0 0 16 16"
									fill="none"
									stroke="currentColor"
									stroke-width="1.8"
									stroke-linecap="round"
									stroke-linejoin="round"
									aria-hidden="true"
								>
									<path class="pricing-card__feature-icon" d="m3 8 3 3 7-7" />
								</svg>
								<span class="text-secondary">{pricingFeature}</span>
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
			{/each}
		</div>

		<p class="docs-callout">Beta users get lifetime 30% discount — limited spots remaining.</p>
	</section>

	<footer class="footer" id="footer">
		<p class="footer__copy">© 2025 ChurnPulse. Built for SaaS founders.</p>
		<nav class="footer__links" aria-label="Footer">
			<a class="footer__link" href="/privacy">Privacy</a>
			<a class="footer__link" href="/terms-and-conditions">Terms</a>
			<a class="footer__link" href="/docs">Changelog</a>
			<a class="footer__link" href="/docs">Docs</a>
		</nav>
	</footer>
</main>
