<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';

	let { data } = $props();
</script>

<svelte:head>
	<title>Sequence Templates | ChurnPulse</title>
	<meta
		name="description"
		content="Preview the recovery email templates that power ChurnPulse retention sequences."
	/>
</svelte:head>

<section class="template-page">
	<div class="page-header__copy">
		<p class="page-header__kicker">
			Template library
		</p>
		<h2 class="page-header__title">
			Read-only previews of every live recovery template.
		</h2>
		<p class="page-header__subtitle">
			This view is informational in v1. It shows the exact subject lines and email layouts used
			by each sequence so operators can audit tone, timing, and structure before customization
			ships.
		</p>
	</div>

	<div class="template-page__grid">
		{#each data.templates as template (template.id)}
			<article class="template-page__card card">
				<div class="template-page__card-top">
					<div class="template-page__copy">
						<div class="template-page__meta">
							<Badge type={template.signalType} size="sm" />
							<span class="section-label">
								Step {template.step}
							</span>
						</div>

						<div class="template-page__subject-block">
							<p class="settings-muted">Subject line</p>
							<p class="section-title">{template.subject}</p>
						</div>
					</div>

					<button
						class="customize-button"
						type="button"
						disabled
						title="Template customization coming soon"
					>
						Customize
					</button>
				</div>

				<div class="template-page__preview-wrap">
					<iframe
						class="template-preview"
						srcdoc={template.html}
						title={`${template.signalLabel} step ${template.step} preview`}
						loading="lazy"
					></iframe>
				</div>
			</article>
		{/each}
	</div>
</section>
