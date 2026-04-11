<script lang="ts">
  import { toastStore, type ToastItem } from "$lib/stores/toast";

  interface Props {
    item: ToastItem;
  }

  let { item }: Props = $props();

  function dismiss(): void {
    toastStore.dismiss(item.id);
  }
</script>

<article class={`toast toast--${item.type}`} role="status" aria-live="polite">
  <div class="toast__icon" aria-hidden="true">
    {#if item.type === "success"}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <path d="m5 13 4 4L19 7" />
      </svg>
    {:else if item.type === "error"}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 8v5" />
        <path d="M12 16h.01" />
        <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
      </svg>
    {:else if item.type === "warning"}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.29 3.86 1.82 18A2 2 0 0 0 3.53 21h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      </svg>
    {:else}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    {/if}
  </div>

  <div class="toast__content">
    {#if item.title}
      <p class="toast__title">{item.title}</p>
    {/if}
    <p class="toast__message">{item.message}</p>
  </div>

  <button class="toast__close" type="button" aria-label="Dismiss notification" onclick={dismiss}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="m18 6-12 12" />
      <path d="m6 6 12 12" />
    </svg>
  </button>

  <span class="toast__progress" style={`animation-duration:${item.duration}ms`} aria-hidden="true"></span>
</article>
