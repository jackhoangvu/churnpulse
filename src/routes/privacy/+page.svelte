<script lang="ts">
	import PublicSiteShell from '$lib/components/marketing/PublicSiteShell.svelte';

	const categories = [
		{
			title: 'Information we collect',
			items: [
				'Account details such as name, email address, and workspace profile information.',
				'Billing and transaction details provided during checkout or subscription management.',
				'Connected workspace data such as billing events, customer identifiers, and retention workflow metadata.',
				'Usage data needed to secure, maintain, and improve the service.'
			]
		},
		{
			title: 'How we use information',
			items: [
				'To provide the ChurnPulse service, including signal detection, dashboards, and automated retention workflows.',
				'To process subscriptions, send receipts, manage refunds, and prevent fraud.',
				'To provide support, investigate errors, and improve product quality and reliability.',
				'To comply with legal obligations and enforce our terms.'
			]
		},
		{
			title: 'Service providers',
			items: [
				'Authentication may be provided by Clerk.',
				'Infrastructure and data storage may be provided through Supabase and hosting providers.',
				'Billing and tax handling may be provided by Paddle or another merchant of record shown at checkout.',
				'Email delivery, analytics, and AI-assisted features may rely on specialized subprocessors needed to operate the product.'
			]
		},
		{
			title: 'Your choices',
			items: [
				'You can update account information from within the product where available.',
				'You can cancel your subscription before renewal to stop future charges.',
				'You can request deletion or export of workspace data subject to legal, security, and fraud-prevention obligations.',
				'You can use billing links in your receipt or checkout provider portal to manage payment details where available.'
			]
		}
	] as const;
</script>

<svelte:head>
	<title>Privacy Policy | ChurnPulse</title>
	<meta
		name="description"
		content="Privacy policy describing how ChurnPulse collects, uses, stores, and processes customer and workspace data."
	/>
</svelte:head>

<PublicSiteShell
	eyebrow="Privacy"
	title="Privacy policy"
	description="This policy explains what information ChurnPulse processes, why it is processed, and how customers can manage their data. It is written to reflect the data flows used to operate the product."
>
	<div class="policy-grid">
		<section class="policy-card policy-card-lead">
			<h2>Summary</h2>
			<p>
				ChurnPulse processes customer and workspace data only to provide subscription software,
				operate billing-related workflows, improve product reliability, and meet legal obligations.
			</p>
			<p>
				We do not sell customer personal data. We limit access to authorized personnel and service
				providers that are necessary to run the service.
			</p>
		</section>

		{#each categories as category (category.title)}
			<section class="policy-card">
				<h2>{category.title}</h2>
				<ul>
					{#each category.items as item (item)}
						<li>{item}</li>
					{/each}
				</ul>
			</section>
		{/each}

		<section class="policy-card">
			<h2>Retention and security</h2>
			<p>
				Data is retained only for as long as needed to operate the service, fulfill contractual
				obligations, maintain security, resolve disputes, and comply with applicable law.
			</p>
			<p>
				We use administrative, technical, and organizational safeguards designed to reduce
				unauthorized access, misuse, or disclosure of the information processed by ChurnPulse.
			</p>
		</section>
	</div>
</PublicSiteShell>
