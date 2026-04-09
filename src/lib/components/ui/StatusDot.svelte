<script lang="ts">
	import type { SignalStatus } from '$lib/types';

	interface Props {
		status: SignalStatus;
	}

	let { status }: Props = $props();

	const statusLabel = $derived(status.replaceAll('_', ' '));
</script>

<span class="status-dot" data-status={status} aria-label={`Signal status: ${statusLabel}`} role="status">
	<span class="status-core"></span>
</span>

<style>
	.status-dot {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 0.85rem;
		height: 0.85rem;
	}

	.status-core {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
		background: var(--text-muted);
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
	}

	.status-dot[data-status='detected'] .status-core {
		background: var(--accent-cyan);
		box-shadow:
			0 0 0 1px rgba(0, 229, 255, 0.2),
			0 0 0 0 rgba(0, 229, 255, 0.45);
		animation: status-pulse 1.6s ease-out infinite;
	}

	.status-dot[data-status='sequence_started'] .status-core {
		background: #4c8dff;
		box-shadow: 0 0 12px rgba(76, 141, 255, 0.45);
	}

	.status-dot[data-status='recovered'] .status-core {
		background: var(--status-success);
		box-shadow: 0 0 12px rgba(0, 208, 132, 0.32);
	}

	.status-dot[data-status='churned'] .status-core {
		background: var(--status-danger);
		box-shadow: 0 0 12px rgba(255, 68, 89, 0.32);
	}

	.status-dot[data-status='dismissed'] .status-core {
		background: #5a6476;
		box-shadow: none;
	}

	@keyframes status-pulse {
		0% {
			box-shadow:
				0 0 0 1px rgba(0, 229, 255, 0.26),
				0 0 0 0 rgba(0, 229, 255, 0.42);
		}

		75% {
			box-shadow:
				0 0 0 1px rgba(0, 229, 255, 0.12),
				0 0 0 8px rgba(0, 229, 255, 0);
		}

		100% {
			box-shadow:
				0 0 0 1px rgba(0, 229, 255, 0.26),
				0 0 0 0 rgba(0, 229, 255, 0);
		}
	}
</style>
