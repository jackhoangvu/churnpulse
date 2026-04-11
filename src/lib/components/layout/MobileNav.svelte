<script lang="ts">
  import { page } from "$app/state";

  interface Props {
    unreadCount?: number;
  }

  type NavItem = {
    href: string;
    label: string;
    icon: "dashboard" | "recovery" | "analytics" | "playbooks" | "settings";
    showBadge?: boolean;
  };

  let { unreadCount = 0 }: Props = $props();

  const items: NavItem[] = [
    { href: "/dashboard", label: "Home", icon: "dashboard" },
    {
      href: "/dashboard/recovery",
      label: "Recovery",
      icon: "recovery",
      showBadge: true,
    },
    { href: "/dashboard/analytics", label: "Analytics", icon: "analytics" },
    { href: "/dashboard/playbooks", label: "Playbooks", icon: "playbooks" },
    { href: "/dashboard/settings", label: "Settings", icon: "settings" },
  ];

  const pathname = $derived(page.url.pathname);
  const activeIndex = $derived(
    Math.max(
      0,
      items.findIndex(
        (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
      ),
    ),
  );
</script>

<nav class="mobile-nav" aria-label="Mobile navigation">
  <span
    class="mobile-nav__indicator"
    style={`transform:translateX(calc(${activeIndex} * 100%))`}
    aria-hidden="true"
  ></span>

  {#each items as item (item.href)}
    <a
      class="mobile-nav__item"
      class:mobile-nav__item--active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
      href={item.href}
      aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}
    >
      <span class="mobile-nav__icon" aria-hidden="true">
        {#if item.icon === "dashboard"}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 13.2 12 4l9 9.2" />
            <path d="M5 10.8V20h14v-9.2" />
          </svg>
        {:else if item.icon === "recovery"}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9-9 4.03-9 9" />
            <path d="m3 12 3-3" />
            <path d="m3 12 3 3" />
            <path d="m9.5 12 2 2 4-4" />
          </svg>
        {:else if item.icon === "analytics"}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 20h16" />
            <path d="M7 16V8" />
            <path d="M12 16V4" />
            <path d="M17 16v-5" />
          </svg>
        {:else if item.icon === "playbooks"}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 6h16" />
            <path d="M4 12h10" />
            <path d="M4 18h16" />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 3v3" />
            <path d="M12 18v3" />
            <path d="m4.93 4.93 2.12 2.12" />
            <path d="m16.95 16.95 2.12 2.12" />
            <path d="M3 12h3" />
            <path d="M18 12h3" />
            <path d="m4.93 19.07 2.12-2.12" />
            <path d="m16.95 7.05 2.12-2.12" />
            <circle cx="12" cy="12" r="3.2" />
          </svg>
        {/if}
      </span>
      <span>{item.label}</span>

      {#if item.showBadge && unreadCount > 0}
        <span class="mobile-nav__badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
      {/if}
    </a>
  {/each}
</nav>
