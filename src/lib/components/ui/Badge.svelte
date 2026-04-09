<script lang="ts">
	import type { SignalType } from '$lib/types';
	import { SIGNAL_CONFIGS } from '$lib/types';

	type BadgeSize = 'sm' | 'md';

	interface Props {
		type: SignalType;
		size?: BadgeSize;
	}

	let { type, size = 'md' }: Props = $props();

	const config = $derived(SIGNAL_CONFIGS[type]);
	const label = $derived(config.label);
	const pulse = $derived(type === 'high_mrr_risk');
</script>

<span
	class="badge"
	class:badge-sm={size === 'sm'}
	class:badge-md={size === 'md'}
	class:badge-pulse={pulse}
	style={`--badge-accent: ${config.color};`}
>
	<span class="badge-label">{label}</span>
</span>

<style>
	.badge {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		border: 1px solid color-mix(in srgb, var(--badge-accent) 26%, transparent);
		border-left-width: 3px;
		background:
			linear-gradient(180deg, color-mix(in srgb, var(--badge-accent) 10%, transparent), transparent),
			var(--bg-elevated);
		color: color-mix(in srgb, var(--badge-accent) 88%, white 12%);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		line-height: 1;
		text-transform: uppercase;
	}

	.badge-sm {
		padding: 0.36rem 0.55rem 0.36rem 0.65rem;
	}

	.badge-md {
		padding: 0.48rem 0.72rem 0.48rem 0.8rem;
	}

	.badge-label {
		white-space: nowrap;
	}

	.badge-pulse {
		box-shadow: 0 0 0 0 color-mix(in srgb, var(--badge-accent) 36%, transparent);
		animation: badge-pulse 1.6s ease-out infinite;
	}

	@keyframes badge-pulse {
		0% {
			box-shadow: 0 0 0 0 color-mix(in srgb, var(--badge-accent) 40%, transparent);
		}

		70% {
			box-shadow: 0 0 0 10px transparent;
		}

		100% {
			box-shadow: 0 0 0 0 transparent;
		}
	}
</style>
