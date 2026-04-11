<script lang="ts">
  export type DonutChartSegment = {
    label: string;
    value: number;
    color: string;
  };

  interface Props {
    segments: DonutChartSegment[];
    size?: number;
    stroke?: number;
    totalLabel?: string;
  }

  let { segments, size = 220, stroke = 24, totalLabel = "Total" }: Props = $props();

  const total = $derived(segments.reduce((sum, segment) => sum + segment.value, 0));
  const radius = $derived((size - stroke) / 2);
  const circumference = $derived(2 * Math.PI * radius);
</script>

<div class="donut-chart">
  <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
    <circle
      class="donut-chart__track"
      cx={size / 2}
      cy={size / 2}
      r={radius}
      stroke-width={stroke}
    ></circle>
    {#each segments as segment, index (segment.label)}
      {@const offset = segments
        .slice(0, index)
        .reduce((sum, entry) => sum + (entry.value / total) * circumference, 0)}
      <circle
        class="donut-chart__segment"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke-width={stroke}
        style={`stroke:${segment.color};stroke-dasharray:${(segment.value / total) * circumference} ${circumference};stroke-dashoffset:${-offset}`}
      ></circle>
    {/each}
  </svg>
  <div class="donut-chart__center">
    <span>{totalLabel}</span>
    <strong>{total}</strong>
  </div>
</div>
