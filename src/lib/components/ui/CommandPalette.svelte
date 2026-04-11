<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { commandPaletteStore } from "$lib/stores/commandPalette";
  import { fuzzySearch } from "$lib/utils/fuzzySearch";
  import { toast } from "$lib/stores/toast";
  import type { ChurnSignal } from "$lib/types";

  type CommandItem = {
    id: string;
    section: "Pages" | "Signals" | "Actions";
    label: string;
    meta?: string;
    href?: string;
    action?: () => void | Promise<void>;
    highlight: number[];
  };

  type SearchSignal = {
    id: string;
    customer_name: string | null;
    customer_email: string | null;
    signal_type: string;
  };

  const pages = [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Recovery Center", href: "/dashboard/recovery" },
    { label: "Analytics", href: "/dashboard/analytics" },
    { label: "Monitoring", href: "/dashboard/monitoring" },
    { label: "Email Playbooks", href: "/dashboard/playbooks" },
    { label: "Settings", href: "/dashboard/settings" },
    { label: "Docs", href: "/docs" },
  ];

  let dialogElement = $state<HTMLDialogElement | null>(null);
  let inputElement = $state<HTMLInputElement | null>(null);
  let query = $state("");
  let activeIndex = $state(0);
  let remoteSignals = $state<SearchSignal[]>([]);

  const localSignals = $derived(
    ((page.data.stats?.recentSignals ?? []) as ChurnSignal[]).map((signal) => ({
      id: signal.id,
      customer_name: signal.customer_name,
      customer_email: signal.customer_email,
      signal_type: signal.signal_type,
    })),
  );

  const commands = $derived.by(() => {
    const items: CommandItem[] = [];
    const normalizedQuery = query.trim();

    for (const item of pages) {
      const match = fuzzySearch(normalizedQuery, item.label);
      if (!match) {
        continue;
      }

      items.push({
        id: `page-${item.href}`,
        section: "Pages",
        label: item.label,
        href: item.href,
        highlight: match.indices,
        meta: item.href,
      });
    }

    const seenSignalIds = new Set<string>();
    for (const signal of [...remoteSignals, ...localSignals]) {
      if (seenSignalIds.has(signal.id)) {
        continue;
      }

      const label =
        signal.customer_name ??
        signal.customer_email ??
        signal.signal_type.replaceAll("_", " ");
      const match = fuzzySearch(normalizedQuery, label);
      if (!match) {
        continue;
      }

      seenSignalIds.add(signal.id);
      items.push({
        id: `signal-${signal.id}`,
        section: "Signals",
        label,
        meta: signal.signal_type.replaceAll("_", " "),
        href: `/dashboard/signals/${signal.id}`,
        highlight: match.indices,
      });
    }

    const actions = [
      {
        label: "Connect Polar",
        meta: "OAuth integration",
        action: () => goto("/api/polar/connect"),
      },
      {
        label: "Connect Stripe",
        meta: "OAuth integration",
        action: () => goto("/api/stripe/connect"),
      },
      {
        label: "Test webhook",
        meta: "Fire sample provider event",
        action: async () => {
          await fetch("/api/test/webhook", { method: "POST" });
          toast.success("Sample webhook dispatched");
        },
      },
      {
        label: "Export signals",
        meta: "CSV export",
        action: () => goto("/dashboard/recovery"),
      },
    ];

    for (const action of actions) {
      const match = fuzzySearch(normalizedQuery, action.label);
      if (!match) {
        continue;
      }

      items.push({
        id: `action-${action.label}`,
        section: "Actions",
        label: action.label,
        meta: action.meta,
        action: action.action,
        highlight: match.indices,
      });
    }

    return items.sort((left, right) => {
      if (left.section === right.section) {
        return left.label.localeCompare(right.label);
      }

      return left.section.localeCompare(right.section);
    });
  });

  function highlightText(label: string, indices: number[]): string {
    const indexSet = new Set(indices);
    return [...label]
      .map((char, index) =>
        indexSet.has(index)
          ? `<span class="command-palette__match">${char}</span>`
          : char,
      )
      .join("");
  }

  async function loadRemoteSignals(currentQuery: string): Promise<void> {
    if (currentQuery.trim().length < 2) {
      remoteSignals = [];
      return;
    }

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(currentQuery.trim())}`,
      );

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { results?: SearchSignal[] };
      remoteSignals = payload.results ?? [];
    } catch {
      remoteSignals = [];
    }
  }

  function closePalette(): void {
    dialogElement?.close();
    commandPaletteStore.close();
  }

  async function runCommand(item: CommandItem): Promise<void> {
    if (item.href) {
      closePalette();
      await goto(item.href);
      return;
    }

    if (item.action) {
      closePalette();
      await item.action();
    }
  }

  function onKeydown(event: KeyboardEvent): void {
    if (!$commandPaletteStore.open) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, commands.length - 1);
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
    }

    if (event.key === "Enter") {
      const item = commands[activeIndex];
      if (item) {
        event.preventDefault();
        void runCommand(item);
      }
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closePalette();
    }
  }

  onMount(() => {
    const onWindowKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        commandPaletteStore.toggle();
      }
    };

    window.addEventListener("keydown", onWindowKeydown);

    return () => {
      window.removeEventListener("keydown", onWindowKeydown);
    };
  });

  $effect(() => {
    query = $commandPaletteStore.query;
  });

  $effect(() => {
    if ($commandPaletteStore.open) {
      if (!dialogElement?.open) {
        dialogElement?.showModal();
      }

      queueMicrotask(() => {
        inputElement?.focus();
        inputElement?.select();
      });
      return;
    }

    if (dialogElement?.open) {
      dialogElement.close();
    }
  });

  $effect(() => {
    activeIndex = 0;
    void loadRemoteSignals(query);
  });
</script>

<dialog class="command-palette" bind:this={dialogElement} onclose={closePalette} onkeydown={onKeydown} onclick={(event) => {
  if (event.target === dialogElement) {
    closePalette();
  }
}}>
  <div class="command-palette__panel">
    <div class="command-palette__header">
      <svg class="command-palette__search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8"></circle>
        <path d="m21 21-4.35-4.35"></path>
      </svg>
      <input
        bind:this={inputElement}
        class="command-palette__input"
        type="text"
        placeholder="Search pages, signals, and actions"
        value={query}
        oninput={(event) => commandPaletteStore.setQuery(event.currentTarget.value)}
        aria-label="Search commands"
      />
    </div>

    <div class="command-palette__results">
      {#if commands.length === 0}
        <p class="command-palette__empty">No matches found.</p>
      {:else}
        {#each commands as item, index (item.id)}
          <button
            class="command-palette__item"
            class:command-palette__item--active={index === activeIndex}
            type="button"
            onclick={() => void runCommand(item)}
          >
            <span class="command-palette__section">{item.section}</span>
            <span class="command-palette__label">
              {@html highlightText(item.label, item.highlight)}
            </span>
            {#if item.meta}
              <span class="command-palette__meta">{item.meta}</span>
            {/if}
          </button>
        {/each}
      {/if}
    </div>
  </div>
</dialog>
