<script lang="ts">
	import PublicSiteShell from '$lib/components/marketing/PublicSiteShell.svelte';

	const plans = [
		{
			name: 'Starter',
			price: '$49',
			description: 'For early-stage SaaS teams that want visibility into failed payments and churn signals.',
			features: [
				'One connected billing workspace',
				'All six churn signal detectors',
				'AI-generated churn analysis',
				'Recovery sequences and scheduling',
				'Team dashboard with daily monitoring'
			]
		},
		{
			name: 'Growth',
			price: '$149',
			description: 'For operators managing more revenue, more customers, and more recovery workflows.',
			features: [
				'Up to three connected workspaces',
				'Priority signal processing',
				'High-MRR internal alert routing',
				'Sequence management and templates',
				'Expanded reporting for recoveries and MRR at risk'
			]
		},
		{
			name: 'Scale',
			price: 'Custom',
			description: 'For larger SaaS businesses with multiple brands, advanced workflows, or custom rollout needs.',
			features: [
				'Custom workspace limits',
				'White-glove onboarding',
				'Custom reporting exports',
				'Priority support and implementation guidance',
				'Commercial terms tailored to your rollout'
			]
		}
	] as const;
</script>

<svelte:head>
	<title>Pricing | ChurnPulse</title>
	<meta
		name="description"
		content="ChurnPulse pricing for SaaS churn prevention, AI signal classification, automated recovery sequences, and revenue monitoring."
	/>
</svelte:head>

<PublicSiteShell
	eyebrow="Commercial terms"
	title="Transparent pricing for revenue recovery"
	description="ChurnPulse is sold as a subscription software service for SaaS teams. Pricing is presented publicly so buyers, reviewers, and billing partners can clearly understand what is included before purchase."
>
	<div class="pricing-grid">
		{#each plans as plan (plan.name)}
			<article class="pricing-card">
				<div class="pricing-card-header">
					<p class="pricing-name">{plan.name}</p>
					<p class="pricing-price">{plan.price}<span>{plan.price === 'Custom' ? '' : '/month'}</span></p>
					<p class="pricing-copy">{plan.description}</p>
				</div>

				<ul class="pricing-list">
					{#each plan.features as feature (feature)}
						<li>{feature}</li>
					{/each}
				</ul>
			</article>
		{/each}
	</div>

	<section class="pricing-panel">
		<div>
			<p class="panel-label">Billing notes</p>
			<h2>What customers buy</h2>
		</div>

		<div class="panel-grid">
			<div>
				<p>ChurnPulse is a subscription SaaS product focused on churn prevention and retention operations.</p>
				<p>Plans include access to the dashboard, signal monitoring, AI-generated analysis, and recovery email sequencing features described on this page.</p>
			</div>
			<div>
				<p>Taxes, currency conversion, and final payment method options are calculated at checkout when applicable.</p>
				<p>Enterprise terms, volume commitments, or custom onboarding services are handled through a separate commercial agreement when needed.</p>
			</div>
		</div>
	</section>
</PublicSiteShell>

<style>
	.pricing-grid {
		display: grid;
		gap: 1rem;
	}

	.pricing-card,
	.pricing-panel {
		border: 1px solid var(--border-default);
		background: linear-gradient(180deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.01));
		padding: 1.35rem;
	}

	.pricing-card-header {
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.pricing-name,
	.pricing-price,
	.pricing-copy,
	.panel-label,
	.panel-grid p,
	.pricing-list {
		margin: 0;
	}

	.pricing-name,
	.panel-label {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.72rem;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		color: var(--accent-cyan);
	}

	.pricing-price {
		margin-top: 0.85rem;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 2.5rem;
		line-height: 1;
		color: white;
	}

	.pricing-price span {
		margin-left: 0.45rem;
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	.pricing-copy {
		margin-top: 0.9rem;
		font-size: 0.96rem;
		line-height: 1.7;
		color: var(--text-secondary);
	}

	.pricing-list {
		padding: 1rem 0 0 1rem;
		display: grid;
		gap: 0.7rem;
		color: var(--text-primary);
	}

	.pricing-list li::marker {
		color: var(--accent-cyan);
	}

	.pricing-panel {
		margin-top: 1rem;
		display: grid;
		gap: 1.25rem;
	}

	.pricing-panel h2 {
		margin: 0.65rem 0 0;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1.6rem;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.panel-grid {
		display: grid;
		gap: 1rem;
	}

	.panel-grid p {
		font-size: 0.98rem;
		line-height: 1.8;
		color: var(--text-secondary);
	}

	.panel-grid p + p {
		margin-top: 0.9rem;
	}

	@media (min-width: 900px) {
		.pricing-grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}

		.pricing-panel {
			grid-template-columns: 18rem 1fr;
		}

		.panel-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
</style>
