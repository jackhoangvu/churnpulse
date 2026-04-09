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

<section class="space-y-6 px-6 py-6 md:px-8">
	<div class="space-y-3">
		<p class="font-mono text-xs uppercase tracking-[0.22em] text-[var(--accent-cyan)]">
			Template library
		</p>
		<h2 class="font-mono text-3xl uppercase tracking-[0.06em] text-white">
			Read-only previews of every live recovery template.
		</h2>
		<p class="max-w-3xl text-sm leading-7 text-[var(--text-secondary)]">
			This view is informational in v1. It shows the exact subject lines and email layouts used
			by each sequence so operators can audit tone, timing, and structure before customization
			ships.
		</p>
	</div>

	<div class="grid gap-4">
		{#each data.templates as template (template.id)}
			<article class="border border-[var(--border-default)] bg-[var(--bg-surface)] p-5">
				<div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div class="space-y-3">
						<div class="flex flex-wrap items-center gap-3">
							<Badge type={template.signalType} size="sm" />
							<span class="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
								Step {template.step}
							</span>
						</div>

						<div>
							<p class="text-sm text-[var(--text-secondary)]">Subject line</p>
							<p class="mt-2 text-lg font-semibold text-white">{template.subject}</p>
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

				<div class="mt-5 border border-[var(--border-subtle)] bg-[var(--bg-base)] p-3">
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

<style>
	.customize-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 38px;
		border: 1px solid var(--border-default);
		padding: 0 1rem;
		background: transparent;
		color: var(--text-muted);
		cursor: not-allowed;
	}

	.template-preview {
		width: 100%;
		height: 200px;
		border: 0;
		background: white;
		pointer-events: none;
	}
</style>
