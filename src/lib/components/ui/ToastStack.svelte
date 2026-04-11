<script lang="ts">
  import { fly } from "svelte/transition";
  import Toast from "$lib/components/ui/Toast.svelte";
  import { toastStore } from "$lib/stores/toast";
</script>

<div class="toast-stack" aria-live="polite" aria-relevant="additions text">
  {#each $toastStore as item (item.id)}
    <div in:fly={{ x: 120, duration: 220 }} out:fly={{ x: 120, duration: 180 }}>
      <Toast {item} />
    </div>
  {/each}
</div>
