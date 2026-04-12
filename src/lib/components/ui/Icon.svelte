<script lang="ts">
	export type IconName =
		| 'analytics'
		| 'arrow-down-right'
		| 'arrow-right'
		| 'arrow-up-right'
		| 'bell'
		| 'bolt'
		| 'book'
		| 'check'
		| 'chevron-down'
		| 'chevron-right'
		| 'close'
		| 'copy'
		| 'dashboard'
		| 'docs'
		| 'dropdown'
		| 'error'
		| 'external-link'
		| 'eye'
		| 'eye-off'
		| 'info'
		| 'mail'
		| 'monitoring'
		| 'moon'
		| 'playbooks'
		| 'plug'
		| 'recovery'
		| 'search'
		| 'settings'
		| 'sparkline'
		| 'sun'
		| 'users'
		| 'warning'
		| 'webhook';

	interface Props {
		name: IconName;
		size?: number;
		class?: string;
		strokeWidth?: number;
		title?: string;
	}

	let {
		name,
		size = 16,
		class: className = '',
		strokeWidth = 1.7,
		title
	}: Props = $props();
</script>

<svg
	class={className}
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width={strokeWidth}
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden={title ? undefined : 'true'}
	role={title ? 'img' : undefined}
>
	{#if title}
		<title>{title}</title>
	{/if}

	{#if name === 'bolt'}
		<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
	{:else if name === 'dashboard'}
		<path d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z" />
	{:else if name === 'recovery'}
		<path d="M12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9" />
		<path d="m3 12 3-3" />
		<path d="m3 12 3 3" />
		<path d="m9.5 12 2 2 4-4" />
	{:else if name === 'analytics'}
		<path d="M4 20h16" />
		<path d="M7 16V8" />
		<path d="M12 16V4" />
		<path d="M17 16v-5" />
	{:else if name === 'sparkline'}
		<path d="M4 18h16" />
		<path d="m5 14 4-4 4 3 6-7" />
	{:else if name === 'arrow-right'}
		<path d="M5 12h14" />
		<path d="m13 6 6 6-6 6" />
	{:else if name === 'arrow-up-right'}
		<path d="M7 17 17 7" />
		<path d="M10 7h7v7" />
	{:else if name === 'arrow-down-right'}
		<path d="m7 7 10 10" />
		<path d="M10 17h7v-7" />
	{:else if name === 'monitoring'}
		<path d="M3 12h4l2.8-6 4.4 12L18 10h3" />
	{:else if name === 'playbooks'}
		<path d="M4 6h16" />
		<path d="M4 12h10" />
		<path d="M4 18h16" />
	{:else if name === 'settings'}
		<path d="M12 3v3" />
		<path d="M12 18v3" />
		<path d="m4.93 4.93 2.12 2.12" />
		<path d="m16.95 16.95 2.12 2.12" />
		<path d="M3 12h3" />
		<path d="M18 12h3" />
		<path d="m4.93 19.07 2.12-2.12" />
		<path d="m16.95 7.05 2.12-2.12" />
		<circle cx="12" cy="12" r="3.2" />
	{:else if name === 'docs' || name === 'book'}
		<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 0 4 23z" />
		<path d="M8 7h8" />
		<path d="M8 11h8" />
	{:else if name === 'external-link'}
		<path d="M14 4h6v6" />
		<path d="M10 14 20 4" />
		<path d="M20 14v6h-6" />
		<path d="M4 10 14 20" />
	{:else if name === 'search'}
		<circle cx="11" cy="11" r="8" />
		<path d="m21 21-4.35-4.35" />
	{:else if name === 'sun'}
		<circle cx="12" cy="12" r="4" />
		<path d="M12 2v2.5" />
		<path d="M12 19.5V22" />
		<path d="m4.93 4.93 1.77 1.77" />
		<path d="m17.3 17.3 1.77 1.77" />
		<path d="M2 12h2.5" />
		<path d="M19.5 12H22" />
		<path d="m4.93 19.07 1.77-1.77" />
		<path d="m17.3 6.7 1.77-1.77" />
	{:else if name === 'moon'}
		<path d="M20.2 15.4A8.8 8.8 0 1 1 8.6 3.8 7 7 0 0 0 20.2 15.4Z" />
	{:else if name === 'plug'}
		<path d="M8 4v6" />
		<path d="M16 4v6" />
		<path d="M7 10h10v3a5 5 0 0 1-5 5v2" />
	{:else if name === 'bell'}
		<path d="M6 9a6 6 0 1 1 12 0c0 4 2 5 2 5H4s2-1 2-5" />
		<path d="M12 20a2.5 2.5 0 0 0 2.3-1.5" />
	{:else if name === 'mail'}
		<rect x="3" y="5" width="18" height="14" rx="2" />
		<path d="m3 7 9 6 9-6" />
	{:else if name === 'info'}
		<circle cx="12" cy="12" r="10" />
		<path d="M12 8h.01" />
		<path d="M12 12v4" />
	{:else if name === 'check'}
		<path d="m5 13 4 4L19 7" />
	{:else if name === 'warning'}
		<path d="M12 9v4" />
		<path d="M12 17h.01" />
		<path d="M10.29 3.86 1.82 18A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
	{:else if name === 'error'}
		<path d="M12 8v5" />
		<path d="M12 16h.01" />
		<path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
	{:else if name === 'close'}
		<path d="m18 6-12 12" />
		<path d="m6 6 12 12" />
	{:else if name === 'chevron-right'}
		<path d="m9 18 6-6-6-6" />
	{:else if name === 'chevron-down' || name === 'dropdown'}
		<path d="m6 9 6 6 6-6" />
	{:else if name === 'copy'}
		<rect x="9" y="9" width="11" height="11" rx="2" />
		<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
	{:else if name === 'eye'}
		<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
		<circle cx="12" cy="12" r="3" />
	{:else if name === 'eye-off'}
		<path d="m3 3 18 18" />
		<path d="M10.58 10.58a2 2 0 0 0 2.84 2.84" />
		<path d="M9.88 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a17.7 17.7 0 0 1-3.05 4.36" />
		<path d="M6.61 6.61A17.3 17.3 0 0 0 1 12s4 8 11 8a10.9 10.9 0 0 0 5.39-1.39" />
	{:else if name === 'users'}
		<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
		<circle cx="9" cy="7" r="4" />
		<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
		<path d="M16 3.13a4 4 0 0 1 0 7.75" />
	{:else if name === 'webhook'}
		<path d="M18 8a3 3 0 1 0-3-3" />
		<path d="M6 16a3 3 0 1 0 3 3" />
		<path d="M9 18h4a3 3 0 0 0 3-3v-2" />
		<path d="M15 6h-4a3 3 0 0 0-3 3v2" />
	{/if}
</svg>
