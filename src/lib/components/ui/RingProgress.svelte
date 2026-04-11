<script lang="ts">
  interface Props {
    value: number;
    size?: number;
    stroke?: number;
    label?: string;
    tone?: "success" | "warning" | "danger" | "brand";
  }

  let { value, size = 44, stroke = 4, label, tone = "brand" }: Props = $props();

  const radius = $derived((size - stroke) / 2);
  const circumference = $derived(2 * Math.PI * radius);
  const progress = $derived(Math.max(0, Math.min(100, value)));
  const dashoffset = $derived(circumference - (progress / 100) * circumference);
</script>

<div class={`ring-progress ring-progress--${tone}`} style={`--ring-size:${size}px;--ring-stroke:${stroke}px`} aria-label={label ?? `${progress}%`}>
  <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
    <circle class="ring-progress__track" cx={size / 2} cy={size / 2} r={radius}></circle>
    <circle
      class="ring-progress__value"
      cx={size / 2}
      cy={size / 2}
      r={radius}
      style={`stroke-dasharray:${circumference};stroke-dashoffset:${dashoffset}`}
    ></circle>
  </svg>
  <span class="ring-progress__label">{Math.round(progress)}</span>
</div>
