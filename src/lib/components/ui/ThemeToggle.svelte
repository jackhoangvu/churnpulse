<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	type ThemeMode = 'dark' | 'light';

	interface Props {
		size?: 'sm' | 'md';
	}

	const STORAGE_KEY = 'churnpulse-theme';

	let { size = 'md' }: Props = $props();
	let theme = $state<ThemeMode>('dark');
	let mounted = $state(false);

	function applyTheme(nextTheme: ThemeMode): void {
		document.documentElement.dataset.theme = nextTheme;
		document.documentElement.style.colorScheme = nextTheme;
		localStorage.setItem(STORAGE_KEY, nextTheme);
		theme = nextTheme;
	}

	function toggleTheme(): void {
		applyTheme(theme === 'dark' ? 'light' : 'dark');
	}

	onMount(() => {
		const stored = localStorage.getItem(STORAGE_KEY);
		const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
		const initialTheme =
			stored === 'light' || stored === 'dark' ? stored : prefersLight ? 'light' : 'dark';

		applyTheme(initialTheme);
		mounted = true;
	});
</script>

<button
	class={`theme-toggle theme-toggle--${size}`}
	type="button"
	aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
	onclick={toggleTheme}
>
	<span class="theme-toggle__icon theme-toggle__icon--sun" class:theme-toggle__icon--active={mounted && theme === 'light'}>
		<Icon name="sun" size={size === 'sm' ? 15 : 17} />
	</span>
	<span class="theme-toggle__icon theme-toggle__icon--moon" class:theme-toggle__icon--active={mounted && theme === 'dark'}>
		<Icon name="moon" size={size === 'sm' ? 15 : 17} />
	</span>
</button>
