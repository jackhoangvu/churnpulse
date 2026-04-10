<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { page } from '$app/state';
	import SignedIn from 'clerk-sveltekit/client/SignedIn.svelte';
	import SignedOut from 'clerk-sveltekit/client/SignedOut.svelte';
	import UserButton from 'clerk-sveltekit/client/UserButton.svelte';
	import {
		dashboardLayoutContextKey,
		type DashboardLayoutContext
	} from '$lib/components/realtime/context';
	import type { Snippet } from 'svelte';

	type NavItem = {
		label: string;
		href: string;
		icon: 'dashboard' | 'signals' | 'sequences' | 'settings' | 'docs';
		external?: boolean;
	};

	interface Props {
		orgName?: string;
		children: Snippet;
		headerActions?: Snippet;
	}

	const navItems: NavItem[] = [
		{ label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
		{ label: 'Signals', href: '/dashboard/signals', icon: 'signals' },
		{ label: 'Sequences', href: '/dashboard/sequences', icon: 'sequences' },
		{ label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
		{ label: 'Docs', href: '/docs', icon: 'docs' }
	];

	let { orgName = 'Connected workspace', children, headerActions }: Props = $props();
	let clerkReady = $state(false);
	let mobileSidebarOpen = $state(false);

	const dashboardContext = getContext<DashboardLayoutContext | undefined>(dashboardLayoutContextKey);
	const pathname = $derived(page.url.pathname);
	const unreadSignalCount = $derived(dashboardContext?.unreadSignalCount ?? 0);
	const title = $derived(
		page.data.title ??
			navItems.find((item) => !item.external && pathname.startsWith(item.href))?.label ??
			'Control Center'
	);
	const breadcrumb = $derived(page.data.breadcrumb ?? ['ChurnPulse', title]);

	function isActive(href: string, external = false): boolean {
		return !external && (pathname === href || pathname.startsWith(`${href}/`));
	}

	function closeMobileSidebar(): void {
		mobileSidebarOpen = false;
	}

	onMount(() => {
		clerkReady = true;
	});

	$effect(() => {
		pathname;
		closeMobileSidebar();
	});

	$effect(() => {
		if (pathname.startsWith('/dashboard/signals') && dashboardContext) {
			dashboardContext.unreadSignalCount = 0;
		}
	});
</script>

<div class="app-shell" id="app-shell">
	<button
		class="mobile-sidebar-overlay"
		class:mobile-sidebar-overlay--open={mobileSidebarOpen}
		type="button"
		aria-label="Close navigation"
		id="mobile-sidebar-overlay"
		onclick={closeMobileSidebar}
	></button>

	<aside class="sidebar" class:sidebar--open={mobileSidebarOpen} aria-label="Primary" id="sidebar">
		<div class="sidebar-top" id="sidebar-top">
			<a class="sidebar__logo wordmark" href="/dashboard" aria-label="ChurnPulse dashboard" id="sidebar-logo">
				<svg
					class="wordmark-bolt"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
					id="sidebar-logo-icon"
				>
					<path class="wordmark-bolt__path" d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
				</svg>
				<span class="sidebar__wordmark wordmark-label" id="sidebar-wordmark">ChurnPulse</span>
			</a>
		</div>

		<nav class="sidebar-nav" id="sidebar-nav">
			{#each navItems as item (item.href)}
				<a
					class="nav-item"
					class:nav-item--active={isActive(item.href, item.external)}
					href={item.href}
					target={item.external ? '_blank' : undefined}
					rel={item.external ? 'noreferrer' : undefined}
					id={`nav-item-${item.icon}`}
					onclick={closeMobileSidebar}
				>
					<span class="nav-icon" aria-hidden="true" id={`nav-icon-${item.icon}`}>
						{#if item.icon === 'dashboard'}
							<svg class="nav-icon__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" id="nav-svg-dashboard">
								<path class="nav-icon__path" d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z" />
							</svg>
						{:else if item.icon === 'signals'}
							<svg class="nav-icon__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" id="nav-svg-signals">
								<path class="nav-icon__path" d="M3 12h4l2.2-5 3.6 10L15 10l1.5 2H21" />
							</svg>
						{:else if item.icon === 'sequences'}
							<svg class="nav-icon__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" id="nav-svg-sequences">
								<path class="nav-icon__path" d="M4 7h16M4 12h10M4 17h16" />
								<path class="nav-icon__path" d="m17 9 3 3-3 3" />
							</svg>
						{:else if item.icon === 'settings'}
							<svg class="nav-icon__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" id="nav-svg-settings">
								<path
									class="nav-icon__path"
									d="M12 3v3M12 18v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M3 12h3M18 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
								/>
								<circle class="nav-icon__circle" cx="12" cy="12" r="3.2" />
							</svg>
						{:else}
							<svg class="nav-icon__svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" id="nav-svg-docs">
								<path class="nav-icon__path" d="M14 4h6v6" />
								<path class="nav-icon__path" d="M10 14 20 4" />
								<path class="nav-icon__path" d="M20 14v6h-6" />
								<path class="nav-icon__path" d="M4 10 14 20" />
							</svg>
						{/if}
					</span>
					<span class="nav-label" id={`nav-label-${item.icon}`}>
						{item.label}
						{#if item.icon === 'signals' && unreadSignalCount > 0}
							<span class="nav-counter nav-item__badge" id="nav-signals-badge">
								{unreadSignalCount}
							</span>
						{/if}
					</span>
				</a>
			{/each}
		</nav>

		<div class="sidebar-bottom" id="sidebar-bottom">
			{#if clerkReady}
				<SignedIn let:user>
					<div class="org-block" id="org-block">
						<div class="org-copy" id="org-copy">
							<p class="org-name" id="org-name">{orgName}</p>
							<p class="org-user" id="org-user">
								{user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Authenticated operator'}
							</p>
						</div>
						<div class="org-actions" id="org-actions">
							<UserButton afterSignOutUrl="/" />
							<svg
								class="caret"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.7"
								aria-hidden="true"
								id="org-caret"
							>
								<path class="caret__path" d="m6 9 6 6 6-6" />
							</svg>
						</div>
					</div>
				</SignedIn>

				<SignedOut>
					<a class="auth-link" href="/sign-in" id="auth-link">
						Authenticate with Clerk
					</a>
				</SignedOut>
			{:else}
				<div class="org-block" id="org-block-fallback">
					<div class="org-copy" id="org-copy-fallback">
						<p class="org-name" id="org-name-fallback">{orgName}</p>
						<p class="org-user" id="org-user-fallback">Authenticated operator</p>
					</div>
					<div class="org-actions" id="org-actions-fallback">
						<div class="avatar-shell" aria-hidden="true" id="org-avatar-fallback">CP</div>
						<svg
							class="caret"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.7"
							aria-hidden="true"
							id="org-caret-fallback"
						>
							<path class="caret__path" d="m6 9 6 6 6-6" />
						</svg>
					</div>
				</div>
			{/if}
		</div>
	</aside>

	<div class="content-column" id="content-column">
		<header class="mobile-header" id="mobile-header">
			<button
				class="icon-button mobile-header__toggle"
				type="button"
				aria-label="Open navigation"
				id="mobile-sidebar-toggle"
				onclick={() => {
					mobileSidebarOpen = !mobileSidebarOpen;
				}}
			>
				<svg
					class="mobile-header__toggle-icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					aria-hidden="true"
					id="mobile-sidebar-toggle-icon"
				>
					<path class="mobile-header__toggle-path" d="M4 7h16M4 12h16M4 17h16" />
				</svg>
			</button>
			<a class="mobile-header__wordmark" href="/dashboard" id="mobile-header-wordmark">
				Churn<em class="mobile-header__wordmark-em" id="mobile-header-wordmark-em">Pulse</em>
			</a>
			<div class="mobile-header__spacer" id="mobile-header-spacer"></div>
		</header>

		<header class="topbar" id="topbar">
			<div class="topbar__copy" id="topbar-copy">
				<p class="breadcrumb" id="topbar-breadcrumb">{breadcrumb.join(' / ')}</p>
				<h1 class="topbar__title page-title" id="topbar-title">{title}</h1>
			</div>

			<div class="topbar__actions header-actions" id="topbar-actions">
				{#if headerActions}
					{@render headerActions()}
				{/if}
			</div>
		</header>

		<main class="content-area" id="content-area">
			{@render children()}
		</main>
	</div>
</div>
