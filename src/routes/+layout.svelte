<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { navigating, page } from "$app/state";
  import favicon from "$lib/assets/favicon.svg";
  import ToastStack from "$lib/components/ui/ToastStack.svelte";
  import CommandPalette from "$lib/components/ui/CommandPalette.svelte";
  import "../app.css";

  let { children } = $props();
  const routeKey = $derived(`${page.url.pathname}${page.url.search}`);
  const isNavigating = $derived(Boolean(navigating.to));
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <meta name="theme-color" content="#0b0d14" />
</svelte:head>

<div class="site-root" class:site-root--navigating={isNavigating}>
  {#key routeKey}
    <div class="site-root__page" in:fly={{ y: 4, duration: 200 }} out:fade={{ duration: 120 }}>
      {@render children()}
    </div>
  {/key}

  <ToastStack />
  <CommandPalette />
</div>
