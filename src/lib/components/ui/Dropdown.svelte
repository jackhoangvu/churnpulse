<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		trigger: Snippet;
		content: Snippet;
		align?: 'start' | 'end';
	}

	let { trigger, content, align = 'start' }: Props = $props();
	let anchor = $state<HTMLDivElement | null>(null);
	let panel = $state<HTMLDivElement | null>(null);
	let open = $state(false);
	let placement = $state<'bottom' | 'top'>('bottom');
	let position = $state({ top: 0, left: 0, minWidth: 0 });

	function close(): void {
		open = false;
	}

	function toggle(): void {
		open = !open;
	}

	function updatePosition(): void {
		if (!anchor) {
			return;
		}

		const rect = anchor.getBoundingClientRect();
		const viewportHeight = window.innerHeight;
		const viewportWidth = window.innerWidth;
		const panelWidth = Math.max(rect.width, 220);
		const nextPlacement = viewportHeight - rect.bottom < 220 ? 'top' : 'bottom';
		const top = nextPlacement === 'bottom' ? rect.bottom + 8 : rect.top - 8;
		const left = align === 'end' ? rect.right - panelWidth : rect.left;

		placement = nextPlacement;
		position = {
			top,
			left: Math.min(Math.max(12, left), viewportWidth - panelWidth - 12),
			minWidth: rect.width
		};
	}

	$effect(() => {
		if (!panel) {
			return;
		}

		const node = panel;
		const onClick = (event: MouseEvent) => {
			const target = event.target as HTMLElement | null;
			if (target?.closest('[data-close-dropdown]')) {
				close();
			}
		};

		node.addEventListener('click', onClick);

		return () => {
			node.removeEventListener('click', onClick);
		};
	});

	$effect(() => {
		if (!open || typeof window === 'undefined') {
			return;
		}

		updatePosition();

		const onDocumentClick = (event: MouseEvent) => {
			if (anchor?.contains(event.target as Node)) {
				return;
			}

			close();
		};

		const onKeydown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				close();
			}
		};

		const onResize = () => updatePosition();

		document.addEventListener('click', onDocumentClick);
		document.addEventListener('keydown', onKeydown);
		window.addEventListener('resize', onResize);
		window.addEventListener('scroll', onResize, true);

		return () => {
			document.removeEventListener('click', onDocumentClick);
			document.removeEventListener('keydown', onKeydown);
			window.removeEventListener('resize', onResize);
			window.removeEventListener('scroll', onResize, true);
		};
	});
</script>

<div class="dropdown" bind:this={anchor}>
	<button class="dropdown__trigger" type="button" onclick={toggle} aria-expanded={open}>
		{@render trigger()}
	</button>

	{#if open}
		<div
			bind:this={panel}
			class={`dropdown__panel dropdown__panel--${placement}`}
			role="menu"
			tabindex="-1"
			style={`top:${position.top}px;left:${position.left}px;min-width:${position.minWidth}px;`}
		>
			{@render content()}
		</div>
	{/if}
</div>
