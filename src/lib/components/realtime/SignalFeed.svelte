<script lang="ts">
	import { createBrowserClient } from '$lib/supabase';
	import { SIGNAL_CONFIGS, type ChurnSignal } from '$lib/types';
	import { toSignal } from '$lib/signal-utils';
	import type { ChurnSignalRow } from '$lib/types/supabase';
	import { toast } from '$lib/stores/toast';

	interface Props {
		orgId: string | null;
		onSignal?: (signal: ChurnSignal) => void;
	}

	const currencyFormatter = new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		maximumFractionDigits: 0
	});
	let { orgId, onSignal }: Props = $props();
	let hasInteracted = $state(false);
	let channelState = $state<'idle' | 'subscribing' | 'subscribed'>('idle');
	let supabase = $state<ReturnType<typeof createBrowserClient> | null>(null);

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
		const customerName = signal.customer_name ?? signal.customer_email ?? 'Polar customer';
		const amount = currencyFormatter.format(signal.mrr_amount / 100);
		const message = `New ${label.toLowerCase()} signal: ${customerName} — ${amount}/mo at risk`;

		toast.info(message, 'Realtime signal');
		onSignal?.(signal);
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
		if (typeof document === 'undefined') {
			return;
		}

		if (!supabase) {
			supabase = createBrowserClient();
		}
	});

	$effect(() => {
		if (!orgId || typeof document === 'undefined' || !supabase) {
			return;
		}

		const client = supabase;
		let activeChannel = subscribe();

		function subscribe() {
			channelState = 'subscribing';

			return client
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

			void client.removeChannel(activeChannel);
			activeChannel = subscribe();
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
			void client.removeChannel(activeChannel);
		};
	});
</script>
