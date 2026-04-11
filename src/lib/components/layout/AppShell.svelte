<script lang="ts">
  import { page } from "$app/state";
  import SignedIn from "clerk-sveltekit/client/SignedIn.svelte";
  import SignedOut from "clerk-sveltekit/client/SignedOut.svelte";
  import UserButton from "clerk-sveltekit/client/UserButton.svelte";
  import type { Snippet } from "svelte";
  import MobileNav from "$lib/components/layout/MobileNav.svelte";
  import { commandPaletteStore } from "$lib/stores/commandPalette";
  import { colorHash } from "$lib/utils/colorHash";

  type NavItem = {
    label: string;
    href: string;
    icon:
      | "dashboard"
      | "recovery"
      | "analytics"
      | "monitoring"
      | "playbooks"
      | "settings"
      | "docs";
    external?: boolean;
    showCount?: boolean;
  };

  interface Props {
    orgName?: string;
    userEmail?: string | null;
    unreadCount?: number;
    children: Snippet;
    headerActions?: Snippet;
  }

  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
    {
      label: "Recovery Center",
      href: "/dashboard/recovery",
      icon: "recovery",
      showCount: true,
    },
    { label: "Analytics", href: "/dashboard/analytics", icon: "analytics" },
    { label: "Monitoring", href: "/dashboard/monitoring", icon: "monitoring" },
    { label: "Email Playbooks", href: "/dashboard/playbooks", icon: "playbooks" },
    { label: "Settings", href: "/dashboard/settings", icon: "settings" },
    { label: "Docs", href: "/docs", icon: "docs", external: true },
  ];

  let {
    orgName = "ChurnPulse workspace",
    userEmail = null,
    unreadCount = 0,
    children,
    headerActions,
  }: Props = $props();

  const pathname = $derived(page.url.pathname);
  const title = $derived(
    page.data.title ??
      navItems.find(
        (item) =>
          !item.external &&
          (pathname === item.href || pathname.startsWith(`${item.href}/`)),
      )?.label ??
      "Dashboard",
  );
  const breadcrumb = $derived(page.data.breadcrumb ?? ["ChurnPulse", title]);
  const initials = $derived.by(() => {
    const source = userEmail?.split("@")[0] ?? orgName;
    return source
      .split(/[.\s_-]+/)
      .map((part) => part.slice(0, 1).toUpperCase())
      .join("")
      .slice(0, 2);
  });
  const avatar = $derived(colorHash(userEmail ?? orgName));

  function isActive(item: NavItem): boolean {
    if (item.external) {
      return false;
    }

    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function openCommandPalette(): void {
    commandPaletteStore.open();
  }
</script>

<div class="app-shell">
  <aside class="app-sidebar" aria-label="Primary navigation">
    <div class="app-sidebar__brand">
      <a class="app-sidebar__logo" href="/dashboard" aria-label="ChurnPulse dashboard">
        <span class="app-sidebar__logo-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path class="app-sidebar__logo-path" d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
          </svg>
        </span>
        <span class="app-sidebar__logo-copy">
          <strong>ChurnPulse</strong>
          <span>Revenue recovery control room</span>
        </span>
      </a>
    </div>

    <nav class="app-sidebar__nav">
      {#each navItems as item (item.href)}
        <a
          class="app-sidebar__link"
          class:app-sidebar__link--active={isActive(item)}
          href={item.href}
          target={item.external ? "_blank" : undefined}
          rel={item.external ? "noreferrer" : undefined}
          aria-current={isActive(item) ? "page" : undefined}
        >
          <span class="app-sidebar__link-indicator" aria-hidden="true"></span>
          <span class="app-sidebar__icon" aria-hidden="true">
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
            {:else if item.icon === "monitoring"}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 12h4l2.8-6 4.4 12L18 10h3" />
              </svg>
            {:else if item.icon === "playbooks"}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 6h16" />
                <path d="M4 12h10" />
                <path d="M4 18h16" />
              </svg>
            {:else if item.icon === "settings"}
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
            {:else}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 4h6v6" />
                <path d="M10 14 20 4" />
                <path d="M20 14v6h-6" />
                <path d="M4 10 14 20" />
              </svg>
            {/if}
          </span>
          <span class="app-sidebar__label">{item.label}</span>
          <span class="app-sidebar__tooltip">{item.label}</span>

          {#if item.showCount && unreadCount > 0}
            <span class="app-sidebar__badge" class:app-sidebar__badge--pulse={unreadCount > 0}>
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          {/if}
        </a>
      {/each}
    </nav>

    <div class="app-sidebar__footer">
      <div class="app-sidebar__identity">
        <span class="app-sidebar__avatar" style={`background:${avatar.gradient}`}>
          {initials}
        </span>
        <div class="app-sidebar__identity-copy">
          <strong>{orgName}</strong>
          <span>{userEmail ?? "Authenticated workspace"}</span>
        </div>
      </div>

      <div class="app-sidebar__auth">
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
        <SignedOut>
          <a class="btn btn-primary btn-sm" href="/sign-in">Sign in</a>
        </SignedOut>
      </div>
    </div>
  </aside>

  <div class="app-shell__main">
    <header class="app-topbar">
      <div class="app-topbar__copy">
        <p class="app-topbar__breadcrumb">
          {#each breadcrumb as crumb, index (crumb)}
            <span>{crumb}</span>
            {#if index < breadcrumb.length - 1}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            {/if}
          {/each}
        </p>
        <h1 class="app-topbar__title">{title}</h1>
      </div>

      <div class="app-topbar__actions">
        <button class="btn btn-ghost btn-sm" type="button" onclick={openCommandPalette} aria-label="Open command palette">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <span>Search</span>
          <kbd>⌘K</kbd>
        </button>

        {#if headerActions}
          {@render headerActions()}
        {/if}
      </div>
    </header>

    <main class="app-content">
      {@render children()}
    </main>

    <MobileNav {unreadCount} />
  </div>
</div>
