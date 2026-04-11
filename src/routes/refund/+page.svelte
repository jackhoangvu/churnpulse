<script lang="ts">
	import PublicSiteShell from '$lib/components/marketing/PublicSiteShell.svelte';

	const policyItems = [
		'Initial subscription purchases are eligible for a full refund within 14 days of the first successful charge.',
		'Renewal charges, annual renewals, and upgrade adjustments are reviewed case by case and may be refunded when the request is made promptly and the service has not been materially consumed.',
		'Cancellation stops future renewals. It does not automatically create a refund for charges that have already been processed.',
		'If a payment is processed by Paddle, billing-related support and self-serve management links may also be available through the buyer receipt and Paddle customer support flows.',
		'Refund abuse, fraud, chargeback manipulation, or repeated short-term use followed by refund requests may result in a refund being refused.'
	] as const;
</script>

<svelte:head>
	<title>Refund Policy | ChurnPulse</title>
	<meta
		name="description"
		content="Refund policy for ChurnPulse subscriptions, renewals, cancellations, and billing support."
	/>
</svelte:head>

<PublicSiteShell
	eyebrow="Billing policy"
	title="Refund policy"
	description="This policy explains when ChurnPulse refunds are available, how cancellation works, and how customers should request billing support."
>
	<div class="refund-layout">
		<section class="refund-card refund-card-lead">
			<h2>How to request a refund</h2>
			<p>
				Request a refund by using the billing support link in your purchase receipt, replying to
				the receipt email, or contacting support through the product if you already have an
				account. Include the purchase email address and transaction reference so the request can be
				located quickly.
			</p>
		</section>

		<section class="refund-card">
			<h2>Refund rules</h2>
			<ul>
				{#each policyItems as item (item)}
					<li>{item}</li>
				{/each}
			</ul>
		</section>

		<section class="refund-card">
			<h2>Timing</h2>
			<p>
				Approved refunds are generally submitted as soon as the request is verified. The time for
				funds to reappear in the customer’s account depends on the payment method and banking
				network used at checkout.
			</p>
			<p>
				If a refund is not possible because of processor or payment method limitations, we will
				explain the reason and propose the next available billing-support path.
			</p>
		</section>
	</div>
</PublicSiteShell>
