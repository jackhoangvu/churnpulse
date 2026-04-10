<script lang="ts">
	import type { SequenceEmail, SignalType } from '$lib/types';

	type StepState = 'sent' | 'current' | 'future' | 'failed';

	interface StepDisplay {
		index: number;
		label: string;
		timeLabel: string;
		state: StepState;
	}

	interface Props {
		emails: SequenceEmail[];
		signalType: SignalType;
	}

	const sequenceLengthBySignal: Record<SignalType, number> = {
		card_failed: 3,
		cancelled: 3,
		disengaged: 3,
		downgraded: 2,
		high_mrr_risk: 2,
		paused: 2,
		trial_ending: 1
	};

	let { emails, signalType }: Props = $props();

	function formatPastLabel(dateString: string | null): string {
		if (!dateString) {
			return 'Sent recently';
		}

		const target = new Date(dateString);
		const diffMs = Date.now() - target.getTime();
		const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));

		if (diffHours < 24) {
			return `Sent ${diffHours}h ago`;
		}

		const diffDays = Math.max(1, Math.round(diffHours / 24));
		return `Sent ${diffDays}d ago`;
	}

	function formatFutureLabel(dateString: string | null): string {
		if (!dateString) {
			return 'Awaiting send';
		}

		const now = new Date();
		const target = new Date(dateString);
		const diffMs = target.getTime() - now.getTime();

		if (diffMs <= 0) {
			return 'Due now';
		}

		const diffHours = Math.round(diffMs / (1000 * 60 * 60));

		if (diffHours < 24) {
			return `In ${Math.max(1, diffHours)}h`;
		}

		const diffDays = Math.round(diffHours / 24);
		return diffDays === 1 ? 'Tomorrow' : `In ${diffDays} days`;
	}

	const orderedEmails = $derived([...emails].sort((left, right) => left.step - right.step));
	const totalSteps = $derived(
		Math.max(
			sequenceLengthBySignal[signalType],
			orderedEmails.reduce((highest, email) => Math.max(highest, email.step), 0)
		)
	);

	const failedStep = $derived(orderedEmails.find((email) => email.status === 'failed')?.step ?? null);
	const currentStep = $derived(
		orderedEmails.find((email) => email.status === 'pending')?.step ?? failedStep ?? null
	);

	const steps = $derived.by((): StepDisplay[] =>
		Array.from({ length: totalSteps }, (_, offset) => {
			const stepIndex = offset + 1;
			const emailForStep = orderedEmails.find((email) => email.step === stepIndex);

			let state: StepState = 'future';
			let timeLabel = 'Awaiting send';

			if (emailForStep?.status === 'sent') {
				state = 'sent';
				timeLabel = formatPastLabel(emailForStep.sent_at ?? emailForStep.created_at);
			} else if (emailForStep?.status === 'failed') {
				state = 'failed';
				timeLabel = 'Retry needed';
			} else if (currentStep === stepIndex) {
				state = 'current';
				timeLabel = formatFutureLabel(emailForStep?.scheduled_for ?? null);
			}

			return {
				index: stepIndex,
				label: `Step ${stepIndex}`,
				timeLabel,
				state
			};
		})
	);
</script>

<div class="sequence-progress" aria-label={`Sequence progress for ${signalType}`}>
	{#each steps as step, index (step.index)}
		<div class="sequence-progress__step">
			<div class="sequence-progress__track">
				<div class="sequence-progress__circle" data-state={step.state}>
					{#if step.state === 'sent'}
						<svg viewBox="0 0 16 16" aria-hidden="true">
							<path
								d="M3.5 8.5 6.4 11.4 12.5 5.3"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
						</svg>
					{/if}
				</div>

				{#if index < steps.length - 1}
					<div class="sequence-progress__connector"></div>
				{/if}
			</div>

			<div class="sequence-progress__copy">
				<p class="sequence-progress__label">{step.label}</p>
				<p class="sequence-progress__time">{step.timeLabel}</p>
			</div>
		</div>
	{/each}
</div>
