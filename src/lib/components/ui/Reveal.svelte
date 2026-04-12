<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		delay?: number;
		distance?: number;
		once?: boolean;
		direction?: 'up' | 'down' | 'left' | 'right';
		stagger?: number;
	}

	let {
		children,
		delay = 0,
		distance = 16,
		once = true,
		direction = 'up',
		stagger = 0
	}: Props = $props();

	let element = $state<HTMLElement | null>(null);
	let visible = $state(false);

	const offsetX = $derived(
		direction === 'left' ? distance : direction === 'right' ? -distance : 0
	);
	const offsetY = $derived(direction === 'down' ? -distance : direction === 'up' ? distance : 0);
	const animationDelay = $derived(`${delay + stagger * 60}ms`);

	$effect(() => {
		if (!element || typeof window === 'undefined') {
			return;
		}

		const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (prefersReducedMotion) {
			visible = true;
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						visible = true;

						if (once) {
							observer.unobserve(entry.target);
						}
					} else if (!once) {
						visible = false;
					}
				}
			},
			{
				threshold: 0.08,
				rootMargin: '0px 0px -40px 0px'
			}
		);

		observer.observe(element);

		return () => observer.disconnect();
	});
</script>

<div
	bind:this={element}
	class="reveal"
	class:revealed={visible}
	style={`--reveal-delay:${animationDelay};--reveal-x:${offsetX}px;--reveal-y:${offsetY}px;`}
>
	{@render children()}
</div>
