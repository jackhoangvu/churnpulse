<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		title?: string;
		description?: string;
		children: Snippet;
		footer?: Snippet;
		onClose?: () => void;
	}

	let { open, title, description, children, footer, onClose }: Props = $props();
	let dialog = $state<HTMLDialogElement | null>(null);
	let active = $state(false);

	function closeModal(): void {
		active = false;
		dialog?.close();
		onClose?.();
	}

	$effect(() => {
		if (!dialog) {
			return;
		}

		if (open) {
			if (!dialog.open) {
				dialog.showModal();
			}

			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					active = true;
				});
			});
			return;
		}

		active = false;
		if (dialog.open) {
			dialog.close();
		}
	});
</script>

<dialog
	bind:this={dialog}
	class="modal"
	class:modal--active={active}
	aria-modal="true"
	aria-label={title}
	onclose={closeModal}
	onclick={(event) => {
		if (event.target === dialog) {
			closeModal();
		}
	}}
>
	<div class="modal__backdrop"></div>
	<div class="modal__panel">
		{#if title}
			<header class="modal__header">
				<h2 class="modal__title">{title}</h2>
				{#if description}
					<p class="modal__description">{description}</p>
				{/if}
			</header>
		{/if}

		<div class="modal__body">
			{@render children()}
		</div>

		{#if footer}
			<footer class="modal__footer">
				{@render footer()}
			</footer>
		{/if}
	</div>
</dialog>
