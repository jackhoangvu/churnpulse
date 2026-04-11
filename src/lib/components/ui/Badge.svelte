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
	const sizeClass = $derived(size === 'sm' ? 'signal-badge--sm' : 'signal-badge--md');
</script>

<span
	class={`signal-badge ${sizeClass}`}
	style={`--signal-color: ${config.color}`}
>
	<span class="signal-badge__label">{label}</span>
</span>
