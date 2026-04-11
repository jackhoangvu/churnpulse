<script lang="ts">
  export type BarChartRow = {
    label: string;
    value: number;
    color?: string;
  };

  interface Props {
    rows: BarChartRow[];
  }

  let { rows }: Props = $props();

  const max = $derived(Math.max(...rows.map((row) => row.value), 1));
</script>

<div class="bar-chart">
  {#each rows as row (row.label)}
    <div class="bar-chart__row">
      <span class="bar-chart__label">{row.label}</span>
      <div class="bar-chart__track">
        <div class="bar-chart__fill" style={`width:${(row.value / max) * 100}%;background:${row.color ?? "var(--brand-500)"}`}></div>
      </div>
      <span class="bar-chart__value">{row.value}</span>
    </div>
  {/each}
</div>
