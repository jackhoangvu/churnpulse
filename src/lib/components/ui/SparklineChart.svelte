<script lang="ts">
  interface Props {
    values: number[];
    height?: number;
    width?: number;
    tone?: "brand" | "success" | "danger" | "warning";
  }

  let { values, height = 56, width = 140, tone = "brand" }: Props = $props();

  const max = $derived(Math.max(...values, 1));
  const min = $derived(Math.min(...values, 0));
  const points = $derived(
    values
      .map((value, index) => {
        const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
        const normalized = max === min ? 0.5 : (value - min) / (max - min);
        const y = height - normalized * (height - 8) - 4;
        return `${x},${y}`;
      })
      .join(" "),
  );
</script>

<svg class={`sparkline sparkline--${tone}`} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
  <polyline points={points}></polyline>
</svg>
