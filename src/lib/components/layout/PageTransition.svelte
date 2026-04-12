<script lang="ts">
	import type { Snippet } from 'svelte';
	import { navigating } from '$app/state';

	interface Props {
		children: Snippet;
	}

	let { children }: Props = $props();
	let element = $state<HTMLElement | null>(null);
	let ready = $state(false);
	let leaving = $state(false);

	function enter(): void {
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				ready = true;
			});
		});
	}

	$effect(() => {
		if (!element) {
			return;
		}

		ready = false;
		enter();
	});

	$effect(() => {
		const destination = navigating.to?.url.pathname ?? null;
		leaving = Boolean(destination);

		if (!destination) {
			ready = false;
			enter();
		}
	});
</script>

<div class="page-transition" class:page-transition--ready={ready} class:page-transition--leaving={leaving}>
	{@render children()}
</div>
