<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		content: string;
		placement?: 'top' | 'bottom' | 'left' | 'right';
		delay?: number;
		children: Snippet;
	}

	let { content, placement = 'top', delay = 400, children }: Props = $props();
	let trigger = $state<HTMLElement | null>(null);
	let open = $state(false);
	let timeout = $state<ReturnType<typeof setTimeout> | null>(null);
	let position = $state({ top: 0, left: 0 });

	function updatePosition(): void {
		if (!trigger) {
			return;
		}

		const rect = trigger.getBoundingClientRect();
		const gap = 10;

		if (placement === 'bottom') {
			position = { top: rect.bottom + gap, left: rect.left + rect.width / 2 };
			return;
		}

		if (placement === 'left') {
			position = { top: rect.top + rect.height / 2, left: rect.left - gap };
			return;
		}

		if (placement === 'right') {
			position = { top: rect.top + rect.height / 2, left: rect.right + gap };
			return;
		}

		position = { top: rect.top - gap, left: rect.left + rect.width / 2 };
	}

	function show(): void {
		updatePosition();
		timeout = setTimeout(() => {
			open = true;
		}, delay);
	}

	function hide(): void {
		if (timeout) {
			clearTimeout(timeout);
			timeout = null;
		}

		open = false;
	}

	$effect(() => {
		if (!trigger) {
			return;
		}

		const node = trigger;
		node.addEventListener('mouseenter', show);
		node.addEventListener('mouseleave', hide);
		node.addEventListener('focus', show);
		node.addEventListener('blur', hide);

		return () => {
			node.removeEventListener('mouseenter', show);
			node.removeEventListener('mouseleave', hide);
			node.removeEventListener('focus', show);
			node.removeEventListener('blur', hide);
		};
	});

	$effect(() => {
		if (!open || typeof window === 'undefined') {
			return;
		}

		const handler = () => updatePosition();
		window.addEventListener('scroll', handler, true);
		window.addEventListener('resize', handler);

		return () => {
			window.removeEventListener('scroll', handler, true);
			window.removeEventListener('resize', handler);
		};
	});
</script>

<span class="tooltip-trigger" bind:this={trigger}>
	{@render children()}
</span>

{#if open}
	<div
		class={`tooltip tooltip--${placement}`}
		role="tooltip"
		style={`top:${position.top}px;left:${position.left}px;`}
	>
		{content}
	</div>
{/if}
