<script lang="ts">
  export type FunnelStep = {
    label: string;
    value: number;
    colorClass?: string;
  };

  interface Props {
    steps: FunnelStep[];
  }

  let { steps }: Props = $props();

  const max = $derived(Math.max(...steps.map((step) => step.value), 1));
</script>

<div class="funnel-chart">
  {#each steps as step, index (step.label)}
    {@const width = 100 - index * 14}
    <div class="funnel-chart__step">
      <div class={`funnel-chart__shape ${step.colorClass ?? ""}`} style={`width:${Math.max(36, width)}%;--funnel-fill:${(step.value / max) * 100}%`}>
        <span>{step.label}</span>
        <strong>{step.value}</strong>
      </div>
    </div>
  {/each}
</div>
