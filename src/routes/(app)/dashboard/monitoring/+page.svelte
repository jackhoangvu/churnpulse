<script lang="ts">
	import { writable } from 'svelte/store';
	import type { PageData } from './$types';
	import { toast } from '$lib/stores/toast';

	interface Props {
		data: PageData;
	}

	type Thresholds = PageData['thresholds'];
	type ThresholdKey = keyof Thresholds;
	type ThresholdEntry = Thresholds[ThresholdKey] & { suffix?: string };

	let { data }: Props = $props();
	const thresholdStore = writable<Record<ThresholdKey, number>>({} as Record<ThresholdKey, number>);
	let saveState = $state<'idle' | 'saving'>('idle');

	const metricEntries = $derived(
		Object.entries(data.metrics) as Array<
			[
				string,
				{ value: number; trend: 'up' | 'stable'; label: string; suffix?: string | undefined }
			]
		>
	);
	const thresholdEntries = $derived(
		Object.entries(data.thresholds) as Array<[ThresholdKey, ThresholdEntry]>
	);

	$effect(() => {
		thresholdStore.set(
			Object.fromEntries(
			(Object.entries(data.thresholds) as Array<[ThresholdKey, ThresholdEntry]>).map(
				([key, value]) => [key, value.value]
			)
			) as Record<ThresholdKey, number>
		);
	});

	function formatValue(value: number, suffix?: string): string {
		return `${value.toFixed(value < 1 ? 3 : 1)}${suffix ?? ''}`;
	}

	function barHeight(values: number[], index: number): number {
		const max = Math.max(...values);

		if (max === 0) {
			return 10;
		}

		return Math.max(10, Math.round((values[index] / max) * 100));
	}

	function isBreached(key: string, value: number): boolean {
		if (key === 'accuracy') {
			return value < $thresholdStore.accuracyFloor;
		}

		if (key === 'predictionAccuracy') {
			return value > $thresholdStore.predictionAccuracyLimit;
		}

		if (key === 'earlyWarning') {
			return value < $thresholdStore.earlyWarningFloor;
		}

		if (key === 'dataStability') {
			return value > $thresholdStore.dataStabilityLimit;
		}

		return false;
	}

	async function saveThresholds(): Promise<void> {
		saveState = 'saving';

		try {
			const response = await fetch('/api/monitoring/thresholds', {
				method: 'POST',
				headers: {
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					thresholds: $thresholdStore
				})
			});

			if (!response.ok) {
				toast.error('Thresholds could not be saved.');
				return;
			}

			toast.success('Thresholds saved.');
		} catch {
			toast.error('Thresholds could not be saved.');
		} finally {
			saveState = 'idle';
		}
	}
</script>

<svelte:head>
	<title>Monitoring | ChurnPulse</title>
	<meta
		name="description"
		content="System health monitoring - model accuracy, prediction power, fairness, and data quality metrics."
	/>
</svelte:head>

<section class="page monitoring-page" id="monitoring-page">
	<div class="page__header" id="monitoring-header">
		<div class="page__header-copy" id="monitoring-header-copy">
			<h1 class="page__title" id="monitoring-title">Monitoring</h1>
			<p class="page__subtitle" id="monitoring-subtitle">{data.runCount} runs tracked</p>
		</div>
		<span class="page__header-badge" id="monitoring-status-badge">
			<svg
				class="page__header-badge-icon"
				width="10"
				height="10"
				viewBox="0 0 10 10"
				aria-hidden="true"
			>
				<circle class="page__header-badge-circle" cx="5" cy="5" r="4" fill="currentColor" />
			</svg>
			Healthy
		</span>
	</div>

	<div class="monitoring-metrics" id="monitoring-metrics">
		{#each metricEntries as [key, metric] (key)}
			<div class="monitoring-metric card" class:monitoring-metric--breach={isBreached(key, metric.value)} id={`monitoring-metric-${key}`}>
				<div class="monitoring-metric__header" id={`monitoring-metric-header-${key}`}>
					<span class="monitoring-metric__name" id={`monitoring-metric-name-${key}`}>
						{metric.label}
						<svg class="monitoring-metric__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
							<circle class="monitoring-metric__icon-circle" cx="12" cy="12" r="10" />
							<path class="monitoring-metric__icon-path" d="M12 8v4M12 16h.01" />
						</svg>
					</span>
				</div>
				<div class="monitoring-metric__value" id={`monitoring-metric-value-${key}`}>
					{formatValue(metric.value, metric.suffix)}
				</div>
				{#if isBreached(key, metric.value)}
					<span class="badge badge-danger">Threshold breached</span>
				{/if}
				{#if metric.trend === 'stable'}
					<span class="monitoring-metric__stable" id={`monitoring-metric-trend-${key}`}>stable</span>
				{:else}
					<div class="monitoring-metric__trend monitoring-metric__trend--up" id={`monitoring-metric-trend-${key}`}>
						<svg class="monitoring-metric__trend-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
							<path class="monitoring-metric__trend-path" d="M18 15l-6-6-6 6" />
						</svg>
						improving
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<div class="chart-card" id="metric-trends-card">
		<div class="chart-card__header" id="metric-trends-header">
			<div class="chart-card__header-copy" id="metric-trends-header-copy">
				<h3 class="chart-card__title" id="metric-trends-title">Metric Trends</h3>
				<p class="chart-card__subtitle" id="metric-trends-subtitle">
					Performance over the last {data.runCount} runs
				</p>
			</div>
		</div>
		<div class="monitoring-trends-grid" id="monitoring-trends-grid">
			{#each [
				{ key: 'accuracy', label: 'Accuracy', values: data.trends.accuracy, final: data.metrics.accuracy.value, line: false },
				{ key: 'predictionAccuracy', label: 'Prediction Accuracy', values: data.trends.predictionAccuracy, final: data.metrics.predictionAccuracy.value, line: true },
				{ key: 'earlyWarning', label: 'Early Warning', values: data.trends.earlyWarning, final: data.metrics.earlyWarning.value, line: false },
				{ key: 'dataStability', label: 'Data Stability', values: data.trends.dataStability, final: data.metrics.dataStability.value, line: true }
			] as trend (trend.key)}
				<div class="metric-trend-row" id={`monitoring-trend-row-${trend.key}`}>
					<span class="metric-trend-name" id={`monitoring-trend-label-${trend.key}`}>{trend.label}</span>
					<div class="metric-trend-bars" id={`monitoring-trend-bars-${trend.key}`} role="img" aria-label={`${trend.label} trend over ${data.runCount} runs`}>
						{#each trend.values as value, index (index)}
							<div
								class="metric-trend-bar"
								class:metric-trend-bar--active={!trend.line}
								class:metric-trend-bar--line={trend.line}
								style={`--trend-height: ${barHeight(trend.values, index)}%`}
								id={`monitoring-trend-bar-${trend.key}-${index}`}
							></div>
						{/each}
					</div>
					<span class="metric-trend-value" id={`monitoring-trend-value-${trend.key}`}>
						{trend.final.toFixed(trend.final < 1 ? 3 : 1)}
					</span>
				</div>
			{/each}
		</div>
	</div>

	<div class="grid-2" id="monitoring-health-row">
		<div class="chart-card" id="monitoring-fairness-card">
			<div class="chart-card__header" id="monitoring-fairness-header">
				<div class="chart-card__header-copy" id="monitoring-fairness-copy">
					<h3 class="chart-card__title" id="monitoring-fairness-title">
						Fairness
						<svg class="chart-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
							<circle class="chart-card__icon-circle" cx="12" cy="12" r="10" />
							<path class="chart-card__icon-path" d="M12 8v4M12 16h.01" />
						</svg>
					</h3>
					<p class="chart-card__subtitle" id="monitoring-fairness-subtitle">
						Checking for scoring bias across customer groups
					</p>
				</div>
			</div>
			<div class="monitoring-card__status" id="monitoring-fairness-status">
				<span class="badge badge-success" id="monitoring-fairness-badge">No Bias Detected</span>
			</div>
			<p class="monitoring-card__copy" id="monitoring-fairness-text">
				Checked across {data.fairness.dimensions.join(', ')}.
			</p>
		</div>

		<div class="chart-card" id="monitoring-data-health-card">
			<div class="chart-card__header" id="monitoring-data-health-header">
				<div class="chart-card__header-copy" id="monitoring-data-health-copy">
					<h3 class="chart-card__title" id="monitoring-data-health-title">
						Data Health
						<svg class="chart-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
							<circle class="chart-card__icon-circle" cx="12" cy="12" r="10" />
							<path class="chart-card__icon-path" d="M12 8v4M12 16h.01" />
						</svg>
					</h3>
					<p class="chart-card__subtitle" id="monitoring-data-health-subtitle">Customer scoring overview</p>
				</div>
			</div>
			<div class="monitoring-data-health__stats" id="monitoring-data-health-stats">
				<div class="monitoring-data-health__stat" id="monitoring-data-health-scored">
					<p class="section-label" id="monitoring-data-health-scored-label">Customers Scored</p>
					<p class="monitoring-data-health__value font-mono" id="monitoring-data-health-scored-value">
						{data.dataHealth.customersScored.toLocaleString()}
					</p>
				</div>
				<div class="monitoring-data-health__stat" id="monitoring-data-health-cancel">
					<p class="section-label" id="monitoring-data-health-cancel-label">Cancellation Rate</p>
					<p class="monitoring-data-health__value font-mono" id="monitoring-data-health-cancel-value">
						{data.dataHealth.cancellationRate}%
					</p>
				</div>
			</div>
		</div>
	</div>

	<div class="chart-card" id="monitoring-thresholds-card">
		<div class="chart-card__header" id="monitoring-thresholds-header">
			<div class="chart-card__header-copy" id="monitoring-thresholds-copy">
				<h3 class="chart-card__title" id="monitoring-thresholds-title">
					Alert Thresholds
					<svg class="chart-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">
						<circle class="chart-card__icon-circle" cx="12" cy="12" r="10" />
						<path class="chart-card__icon-path" d="M12 8v4M12 16h.01" />
					</svg>
				</h3>
			</div>
			<button class="btn btn-primary btn-sm" type="button" onclick={() => void saveThresholds()} aria-busy={saveState === 'saving'}>
				{saveState === 'saving' ? 'Saving…' : 'Save thresholds'}
			</button>
		</div>
		<div class="monitoring-thresholds" id="monitoring-thresholds-list">
			{#each thresholdEntries as [key, threshold] (key)}
				<div class="slider-row" id={`monitoring-threshold-row-${key}`}>
					<div class="slider-row__copy" id={`monitoring-threshold-copy-${key}`}>
						<div class="slider-row__label" id={`monitoring-threshold-label-${key}`}>{threshold.label}</div>
						<div class="slider-row__desc" id={`monitoring-threshold-desc-${key}`}>{threshold.desc}</div>
					</div>
					<input
						class="slider-input"
						id={`monitoring-threshold-slider-${key}`}
						type="range"
						min={threshold.min}
						max={threshold.max}
						step={threshold.step}
						bind:value={$thresholdStore[key]}
						aria-label={threshold.label}
					/>
					<div class="slider-row__value" id={`monitoring-threshold-value-${key}`}>
						{typeof $thresholdStore[key] === 'number'
							? $thresholdStore[key].toFixed(threshold.step < 1 ? (threshold.step < 0.1 ? 2 : 1) : 0)
							: $thresholdStore[key]}{threshold.suffix ?? ''}
					</div>
				</div>
			{/each}
		</div>
	</div>
</section>
