<script lang="ts">
  import { page } from "$app/state";
  import "$lib/../app.css";
  import favicon from "$lib/assets/favicon.svg";
  import PageTransition from "$lib/components/layout/PageTransition.svelte";

  let { children } = $props();
  const isDashboardRoute = $derived(page.url.pathname.startsWith("/dashboard"));
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <meta name="theme-color" content="#111318" />
</svelte:head>

<a class="skip-link" href="#main-content">Skip to main content</a>

{#if isDashboardRoute}
  {@render children()}
{:else}
  <PageTransition>
    {@render children()}
  </PageTransition>
{/if}
