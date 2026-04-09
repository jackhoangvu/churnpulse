<script lang="ts">
	import { createEventDispatcher, getContext } from 'svelte';
	import { createBrowserClient } from '$lib/supabase';
	import {
		dashboardLayoutContextKey,
		type DashboardLayoutContext
	} from '$lib/components/realtime/context';
	import { SIGNAL_CONFIGS, type ChurnSignal } from '$lib/types';
	import { toSignal } from '$lib/signal-utils';
	import type { ChurnSignalRow } from '$lib/types/supabase';

	type Toast = {
		id: string;
		message: string;
	};

	interface Props {
		orgId: string | null;
	}

	const currencyFormatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	});
	const context = getContext<DashboardLayoutContext | undefined>(dashboardLayoutContextKey);
	const dispatch = createEventDispatcher<{
		'new-signal': ChurnSignal;
	}>();

	let { orgId }: Props = $props();
	let toasts = $state<Toast[]>([]);
	let hasInteracted = $state(false);
	let channelState = $state<'idle' | 'subscribing' | 'subscribed'>('idle');

	function addToast(message: string): void {
		const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
		toasts = [{ id, message }, ...toasts].slice(0, 3);

		window.setTimeout(() => {
			toasts = toasts.filter((toast) => toast.id !== id);
		}, 4000);
	}

	async function playBeep(): Promise<void> {
		if (!hasInteracted || typeof window === 'undefined') {
			return;
		}

		const AudioContextClass = window.AudioContext || (window as typeof window & {
			webkitAudioContext?: typeof AudioContext;
		}).webkitAudioContext;

		if (!AudioContextClass) {
			return;
		}

		const context = new AudioContextClass();
		const now = context.currentTime;
		const gain = context.createGain();
		gain.gain.setValueAtTime(0.0001, now);
		gain.gain.exponentialRampToValueAtTime(0.035, now + 0.02);
		gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
		gain.connect(context.destination);

		for (const [index, frequency] of [440, 620].entries()) {
			const oscillator = context.createOscillator();
			const startAt = now + index * 0.1;
			const endAt = startAt + 0.08;
			oscillator.type = 'sine';
			oscillator.frequency.setValueAtTime(frequency, startAt);
			oscillator.connect(gain);
			oscillator.start(startAt);
			oscillator.stop(endAt);
		}

		window.setTimeout(() => {
			void context.close().catch(() => undefined);
		}, 300);
	}

	function handleIncomingSignal(signal: ChurnSignal): void {
		const label = SIGNAL_CONFIGS[signal.signal_type].label;
		const customerName = signal.customer_name ?? signal.customer_email ?? 'Stripe customer';
		const amount = currencyFormatter.format(signal.mrr_amount / 100);
		const message = `New ${label.toLowerCase()} signal: ${customerName} — ${amount}/mo at risk`;

		addToast(message);
		context?.unreadSignalCount.update((count) => count + 1);
		dispatch('new-signal', signal);
		void playBeep();
	}

	$effect(() => {
		if (typeof document === 'undefined') {
			return;
		}

		const markInteracted = () => {
			hasInteracted = true;
		};

		document.addEventListener('pointerdown', markInteracted, { passive: true });
		document.addEventListener('keydown', markInteracted);

		return () => {
			document.removeEventListener('pointerdown', markInteracted);
			document.removeEventListener('keydown', markInteracted);
		};
	});

	$effect(() => {
		if (!orgId || typeof document === 'undefined') {
			return;
		}

		const supabase = createBrowserClient();
		let activeChannel = subscribe();

		function subscribe() {
			channelState = 'subscribing';

			return supabase
				.channel(`churn-signals:${orgId}`)
				.on(
					'postgres_changes',
					{
						event: 'INSERT',
						schema: 'public',
						table: 'churn_signals',
						filter: `org_id=eq.${orgId}`
					},
					(payload) => {
						const row = payload.new as ChurnSignalRow;
						handleIncomingSignal(toSignal(row));
					}
				)
				.subscribe((status) => {
					channelState = status === 'SUBSCRIBED' ? 'subscribed' : 'idle';
				});
		}

		const handleVisibilityChange = () => {
			if (document.visibilityState !== 'visible' || channelState === 'subscribed') {
				return;
			}

			void supabase.removeChannel(activeChannel);
			activeChannel = subscribe();
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			void supabase.removeChannel(activeChannel);
		};
	});
</script>

{#if toasts.length > 0}
	<div class="signal-feed-toasts" aria-live="polite" aria-atomic="true">
		{#each toasts as toast (toast.id)}
			<div class="signal-toast">
				<div class="signal-toast-accent"></div>
				<p>{toast.message}</p>
			</div>
		{/each}
	</div>
{/if}

<style>
	.signal-feed-toasts {
		position: fixed;
		right: 1.25rem;
		bottom: 1.25rem;
		z-index: 50;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-width: min(22rem, calc(100vw - 2rem));
	}

	.signal-toast {
		display: grid;
		grid-template-columns: 3px 1fr;
		border: 1px solid rgba(0, 229, 255, 0.14);
		background: rgba(17, 17, 19, 0.96);
		box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);
		backdrop-filter: blur(14px);
		animation: slide-up 180ms ease-out;
	}

	.signal-toast-accent {
		background: var(--accent-cyan);
	}

	.signal-toast p {
		margin: 0;
		padding: 0.9rem 1rem;
		font-size: 0.9rem;
		line-height: 1.5;
		color: var(--text-primary);
	}

	@keyframes slide-up {
		from {
			opacity: 0;
			transform: translateY(10px);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
	}
</style>
