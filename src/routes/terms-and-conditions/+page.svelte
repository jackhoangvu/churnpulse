<script lang="ts">
	import PublicSiteShell from '$lib/components/marketing/PublicSiteShell.svelte';

	const sections = [
		{
			title: 'Service scope',
			body: [
				'ChurnPulse provides subscription software for billing event monitoring, churn signal detection, AI-assisted retention analysis, and recovery workflow management for SaaS businesses.',
				'Access to the service is provided on a subscription basis and includes the features and limits described on the pricing page or in a separate commercial order.'
			]
		},
		{
			title: 'Accounts and access',
			body: [
				'Customers are responsible for maintaining the security of their account credentials, connected billing systems, and team member access.',
				'You may not use ChurnPulse to process unlawful content, abuse connected payment infrastructure, or interfere with the platform, its customers, or third-party service providers.'
			]
		},
		{
			title: 'Billing and renewals',
			body: [
				'Paid subscriptions renew automatically on the billing cadence selected at checkout unless cancelled before the next renewal date.',
				'Charges may be processed by Paddle or another authorized merchant of record shown at checkout. Taxes and transaction details are presented during the purchase flow.'
			]
		},
		{
			title: 'Customer responsibilities',
			body: [
				'You are responsible for the accuracy of your connected billing data, recovery messaging configuration, and compliance with laws applicable to your business and customers.',
				'You remain responsible for the content you send through the platform, including recovery emails, notices, and account communications.'
			]
		},
		{
			title: 'Availability and changes',
			body: [
				'ChurnPulse may improve, modify, or discontinue features from time to time in order to maintain platform security, usability, and product performance.',
				'We may suspend access in cases of abuse, non-payment, fraud risk, or material violations of these terms.'
			]
		},
		{
			title: 'Cancellation and termination',
			body: [
				'You may cancel your subscription at any time. Cancellation stops future renewals but does not retroactively undo charges already incurred unless a refund is approved under the refund policy or required by law.',
				'Upon termination, access to the service may be limited or removed and connected processing workflows may stop operating.'
			]
		},
		{
			title: 'Liability',
			body: [
				'ChurnPulse is provided on an as-available basis. To the fullest extent permitted by law, indirect, incidental, and consequential damages are excluded.',
				'Any liability related to the service is limited to the amount paid for ChurnPulse during the twelve months immediately preceding the event giving rise to the claim.'
			]
		}
	] as const;
</script>

<svelte:head>
	<title>Terms and Conditions | ChurnPulse</title>
	<meta
		name="description"
		content="Terms and conditions governing use of the ChurnPulse churn prevention and recovery software service."
	/>
</svelte:head>

<PublicSiteShell
	eyebrow="Legal terms"
	title="Terms and conditions"
	description="These terms govern access to and use of ChurnPulse. They are written to make the commercial scope, billing model, and customer responsibilities clear before purchase."
>
	<div class="legal-stack">
		<section class="legal-card legal-card-lead">
			<p>
				These Terms and Conditions apply to the use of ChurnPulse, a subscription software service
				operated under the ChurnPulse brand. By purchasing, accessing, or using the service, you
				agree to these terms.
			</p>
			<p>
				If you purchase through a merchant of record such as Paddle, the checkout, payment
				processing, invoicing, and tax handling may also be subject to that provider’s applicable
				transaction terms.
			</p>
		</section>

		{#each sections as section (section.title)}
			<section class="legal-card">
				<h2>{section.title}</h2>
				{#each section.body as paragraph (paragraph)}
					<p>{paragraph}</p>
				{/each}
			</section>
		{/each}
	</div>
</PublicSiteShell>

<style>
	.legal-stack {
		display: grid;
		gap: 1rem;
	}

	.legal-card {
		border: 1px solid var(--border-default);
		background: rgba(17, 17, 19, 0.9);
		padding: 1.35rem;
	}

	.legal-card-lead {
		border-color: var(--border-accent);
		background: linear-gradient(180deg, rgba(0, 229, 255, 0.08), rgba(255, 255, 255, 0.02));
	}

	.legal-card h2,
	.legal-card p {
		margin: 0;
	}

	.legal-card h2 {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.92rem;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--accent-cyan);
	}

	.legal-card p {
		font-size: 0.98rem;
		line-height: 1.85;
		color: var(--text-secondary);
	}

	.legal-card p + p,
	.legal-card h2 + p {
		margin-top: 0.95rem;
	}
</style>
