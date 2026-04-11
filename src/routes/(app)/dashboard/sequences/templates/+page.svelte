<script lang="ts">
	import Badge from '$lib/components/ui/Badge.svelte';
	import { toast } from '$lib/stores/toast';

	let { data } = $props();
	let customizationDialog = $state<HTMLDialogElement | null>(null);
	let selectedTemplateId = $state<string | null>(null);

	function openCustomizationRequest(templateId: string): void {
		selectedTemplateId = templateId;
		customizationDialog?.showModal();
	}

	function submitCustomizationRequest(event: SubmitEvent): void {
		event.preventDefault();
		const formData = new FormData(event.currentTarget as HTMLFormElement);
		const templateId = String(formData.get('template_id') ?? '');
		const email = String(formData.get('email') ?? '');
		const notes = String(formData.get('notes') ?? '');
		const subject = encodeURIComponent(`Template customization request: ${templateId}`);
		const body = encodeURIComponent(`Workspace email: ${email}\n\nTemplate: ${templateId}\n\nRequest:\n${notes}`);

		window.location.href = `mailto:support@churnpulse.io?subject=${subject}&body=${body}`;
		customizationDialog?.close();
		toast.success('Your email client was opened with the customization request.');
	}
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
			Recovery templates used across your live sequences.
		</h2>
		<p class="page-header__subtitle">
			Review the exact subject lines and layouts used by each sequence, then request tailored edits
			for the templates that need operator-specific copy or brand treatment.
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
						onclick={() => openCustomizationRequest(template.id)}
					>
						Request customization
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

	<dialog class="command-palette" bind:this={customizationDialog}>
		<form class="command-palette__panel" method="dialog" onsubmit={submitCustomizationRequest}>
			<div class="command-palette__header">
				<h3>Request customization</h3>
			</div>
			<input type="hidden" name="template_id" value={selectedTemplateId ?? ''} />
			<label class="form-group">
				<span class="form-label">Contact email</span>
				<input class="form-input" type="email" name="email" required />
			</label>
			<label class="form-group">
				<span class="form-label">Requested changes</span>
				<textarea class="form-input" name="notes" rows="5" placeholder="Tone, branding, variables, CTA changes, or provider-specific copy."></textarea>
			</label>
			<div class="settings-provider-card__actions">
				<button class="btn btn-primary btn-sm" type="submit">Email request</button>
				<button class="btn btn-secondary btn-sm" type="button" onclick={() => customizationDialog?.close()}>
					Cancel
				</button>
			</div>
		</form>
	</dialog>
</section>
