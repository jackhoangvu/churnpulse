<script lang="ts">
  export type AreaChartPoint = {
    label: string;
    value: number;
  };

  interface Props {
    points: AreaChartPoint[];
    width?: number;
    height?: number;
  }

  let { points, width = 640, height = 260 }: Props = $props();

  const max = $derived(Math.max(...points.map((point) => point.value), 1));
  const linePoints = $derived(
    points
      .map((point, index) => {
        const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
        const y = height - (point.value / max) * (height - 24) - 12;
        return `${x},${y}`;
      })
      .join(" "),
  );
  const areaPoints = $derived(`${linePoints} ${width},${height} 0,${height}`);
</script>

<svg class="area-chart" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
  <defs>
    <linearGradient id="area-chart-fill" x1="0%" x2="0%" y1="0%" y2="100%">
      <stop offset="0%" stop-color="var(--brand-400)" stop-opacity="0.45"></stop>
      <stop offset="100%" stop-color="var(--brand-400)" stop-opacity="0"></stop>
    </linearGradient>
  </defs>
  <polygon class="area-chart__fill" points={areaPoints}></polygon>
  <polyline class="area-chart__line" points={linePoints}></polyline>
</svg>
