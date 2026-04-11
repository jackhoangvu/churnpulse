<script lang="ts">
	import type { SignalStatus } from '$lib/types';

	interface Props {
		status: SignalStatus;
	}

	let { status }: Props = $props();

	const statusLabel = $derived(status.replaceAll('_', ' '));
</script>

<span
	class={`status-dot status-dot--${status}`}
	aria-label={`Signal status: ${statusLabel}`}
	role="status"
>
	<span class="status-dot__core"></span>
</span>
