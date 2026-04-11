<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let activeView = $state<'preview' | 'html'>('preview');
	let iframeEl = $state<HTMLIFrameElement | null>(null);
	let sidebarEl = $state<HTMLDivElement | null>(null);
	let savedScrollTop = $state(0);

	function updatePreview(html: string): void {
		if (!iframeEl?.contentDocument) {
			return;
		}

		iframeEl.contentDocument.open();
		iframeEl.contentDocument.write(html);
		iframeEl.contentDocument.close();
	}

	async function selectTemplate(id: string): Promise<void> {
		savedScrollTop = sidebarEl?.scrollTop ?? 0;
		await goto(`?template=${id}`, { noScroll: true });
	}

	$effect(() => {
		if (activeView === 'preview' && iframeEl && data.preview.html) {
			updatePreview(data.preview.html);
		}
	});

	$effect(() => {
		if (sidebarEl && savedScrollTop > 0) {
			sidebarEl.scrollTop = savedScrollTop;
		}
	});
</script>

<svelte:head>
	<title>Email Playbooks | ChurnPulse</title>
	<meta
		name="description"
		content="Preview and manage recovery email templates - dunning sequences, outreach playbooks, and advanced recovery flows."
	/>
</svelte:head>

<section class="page playbooks-page" id="playbooks-page">
	<div class="page__header" id="playbooks-header">
		<div class="page__header-copy" id="playbooks-header-copy">
			<h1 class="page__title" id="playbooks-title">Email Playbooks</h1>
			<p class="page__subtitle" id="playbooks-subtitle">
				Preview the automated emails sent by recovery and retention workflows.
			</p>
		</div>
	</div>

		<div class="playbooks-shell" id="playbooks-shell">
		<div class="playbooks-sidebar" id="playbooks-sidebar" role="navigation" aria-label="Template library" bind:this={sidebarEl}>
			{#each data.groups as group (group.key)}
				<div class="playbooks-sidebar__group" id={`playbooks-group-${group.key}`}>
					<div class="playbooks-sidebar__group-header" id={`playbooks-group-header-${group.key}`}>
						<span class="playbooks-sidebar__group-name" id={`playbooks-group-name-${group.key}`}>{group.label}</span>
						<span class={`badge ${group.badgeClass}`} id={`playbooks-group-badge-${group.key}`}>{group.badge}</span>
					</div>
					{#each data.templates.filter((template) => template.group === group.key) as template (template.id)}
						<button
							class="playbooks-sidebar__item"
							class:playbooks-sidebar__item--active={data.selectedId === template.id}
							type="button"
							id={`playbooks-template-link-${template.id}`}
							aria-current={data.selectedId === template.id ? 'true' : undefined}
							onclick={() => selectTemplate(template.id)}
						>
							<svg class="playbooks-sidebar__item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
								<path class="playbooks-sidebar__item-path" d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
								<polyline class="playbooks-sidebar__item-polyline" points="22,6 12,13 2,6" />
							</svg>
							<span class="playbooks-sidebar__item-name" id={`playbooks-template-name-${template.id}`}>{template.name}</span>
							<svg class="playbooks-sidebar__item-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
								<path class="playbooks-sidebar__item-arrow-path" d="m9 18 6-6-6-6" />
							</svg>
						</button>
					{/each}
				</div>
			{/each}
		</div>

		<div class="playbooks-detail" id="playbooks-detail">
			<div class="playbooks-detail__header" id="playbooks-detail-header">
				<div class="playbooks-detail__header-copy" id="playbooks-detail-header-copy">
					<h2 class="playbooks-detail__name" id="playbooks-detail-name">{data.selected.name}</h2>
					<p class="playbooks-detail__trigger" id="playbooks-detail-trigger">Trigger: {data.selected.trigger}</p>
				</div>
				<div class="playbooks-detail__preview-tabs" id="playbooks-detail-tabs" role="tablist">
					<button
						class={`btn btn-sm ${activeView === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
						id="playbooks-tab-preview"
						type="button"
						role="tab"
						aria-selected={activeView === 'preview'}
						onclick={() => (activeView = 'preview')}
					>
						<svg class="playbooks-detail__tab-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
							<path class="playbooks-detail__tab-path" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
							<circle class="playbooks-detail__tab-circle" cx="12" cy="12" r="3" />
						</svg>
						Preview
					</button>
					<button
						class={`btn btn-sm ${activeView === 'html' ? 'btn-primary' : 'btn-secondary'}`}
						id="playbooks-tab-html"
						type="button"
						role="tab"
						aria-selected={activeView === 'html'}
						onclick={() => (activeView = 'html')}
					>
						&lt;&gt; HTML
					</button>
				</div>
			</div>

			<div class="playbooks-detail__subject-block" id="playbooks-detail-subject-block">
				<p class="playbooks-detail__subject-label" id="playbooks-detail-subject-label">Subject Line</p>
				<p class="playbooks-detail__subject" id="playbooks-detail-subject">{data.preview.subject}</p>
			</div>

			<div class="playbooks-detail__variables-block" id="playbooks-detail-variables-block">
				<p class="playbooks-detail__subject-label" id="playbooks-detail-variables-label">Variables</p>
				<div class="playbooks-detail__vars" id="playbooks-detail-vars">
					{#each data.selected.variables as variable (variable)}
						<span class="playbooks-detail__var" id={`playbooks-detail-var-${variable}`}>{`{{ ${variable} }}`}</span>
					{/each}
				</div>
			</div>

			<div class="playbooks-detail__preview-frame" id="playbooks-detail-preview-frame">
				<div class="playbooks-detail__frame-bar" id="playbooks-detail-frame-bar" aria-hidden="true">
					<div class="playbooks-detail__frame-dot playbooks-detail__frame-dot--red" id="playbooks-detail-dot-red"></div>
					<div class="playbooks-detail__frame-dot playbooks-detail__frame-dot--yellow" id="playbooks-detail-dot-yellow"></div>
					<div class="playbooks-detail__frame-dot playbooks-detail__frame-dot--green" id="playbooks-detail-dot-green"></div>
					<span class="playbooks-detail__frame-label" id="playbooks-detail-frame-label">Email Preview</span>
					<span class="playbooks-detail__frame-applied" id="playbooks-detail-frame-applied">Sample data applied</span>
				</div>

				{#if activeView === 'preview'}
					<iframe
						class="playbooks-detail__iframe"
						id="playbooks-detail-iframe"
						title={`${data.selected.name} email preview`}
						bind:this={iframeEl}
						sandbox="allow-same-origin"
						loading="lazy"
					></iframe>
				{:else}
					<div class="playbooks-detail__html-view" id="playbooks-detail-html-view">
						<pre class="docs-code playbooks-detail__html-source" id="playbooks-detail-html-source">{data.preview.html}</pre>
					</div>
				{/if}
			</div>
		</div>
	</div>
</section>
