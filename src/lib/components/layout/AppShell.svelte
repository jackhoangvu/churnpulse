<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import SignedIn from 'clerk-sveltekit/client/SignedIn.svelte';
	import SignedOut from 'clerk-sveltekit/client/SignedOut.svelte';
	import UserButton from 'clerk-sveltekit/client/UserButton.svelte';
	import type { Snippet } from 'svelte';

	type NavItem = {
		label: string;
		href: string;
		icon: 'dashboard' | 'recovery' | 'analytics' | 'monitoring' | 'playbooks' | 'settings' | 'docs';
		external?: boolean;
		showCount?: boolean;
	};

	interface Props {
		orgName?: string;
		unreadCount?: number;
		children: Snippet;
		headerActions?: Snippet;
	}

	const navItems: NavItem[] = [
		{ label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
		{ label: 'Recovery Center', href: '/dashboard/recovery', icon: 'recovery', showCount: true },
		{ label: 'Analytics', href: '/dashboard/analytics', icon: 'analytics' },
		{ label: 'Monitoring', href: '/dashboard/monitoring', icon: 'monitoring' },
		{ label: 'Email Playbooks', href: '/dashboard/playbooks', icon: 'playbooks' },
		{ label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
		{ label: 'Docs', href: '/docs', icon: 'docs', external: true }
	];

	let { orgName = 'ChurnPulse workspace', unreadCount = 0, children, headerActions }: Props = $props();
	let clerkReady = $state(false);

	const pathname = $derived(page.url.pathname);
	const title = $derived(
		page.data.title ??
			navItems.find(
				(item) => !item.external && (pathname === item.href || pathname.startsWith(`${item.href}/`))
			)?.label ??
			'Dashboard'
	);
	const breadcrumb = $derived(page.data.breadcrumb ?? ['ChurnPulse', title]);

	function isActive(href: string, external = false): boolean {
		if (external) {
			return false;
		}

		return pathname === href || pathname.startsWith(`${href}/`);
	}

	onMount(() => {
		clerkReady = true;
	});
</script>

<div class="app-shell" id="app-shell">
	<aside class="sidebar" id="sidebar" aria-label="Primary navigation">
		<a class="sidebar__logo" href="/dashboard" id="sidebar-logo" aria-label="ChurnPulse home">
			<svg
				class="sidebar__logo-icon"
				width="18"
				height="18"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
				id="sidebar-logo-icon"
			>
				<path class="sidebar__logo-path" d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
			</svg>
			<span class="sidebar__wordmark" id="sidebar-wordmark">Churn<em id="sidebar-wordmark-em">Pulse</em></span>
		</a>

		<div class="sidebar__section" id="sidebar-section-main">
			<span class="sidebar__section-label" id="sidebar-section-label-main">Dashboard</span>
			<nav class="sidebar__nav" id="sidebar-nav" aria-label="Main navigation">
				{#each navItems as item (item.href)}
					<a
						class="nav-item"
						class:nav-item--active={isActive(item.href, item.external)}
						href={item.href}
						target={item.external ? '_blank' : undefined}
						rel={item.external ? 'noreferrer' : undefined}
						id={`nav-${item.icon}`}
						aria-current={isActive(item.href, item.external) ? 'page' : undefined}
					>
						<svg
							class="nav-item__icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.7"
							aria-hidden="true"
							id={`nav-icon-${item.icon}`}
						>
							{#if item.icon === 'dashboard'}
								<path class="nav-item__icon-path" d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z" />
							{:else if item.icon === 'recovery'}
								<path class="nav-item__icon-path" d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
								<path class="nav-item__icon-path" d="m9 12 2 2 4-4" />
							{:else if item.icon === 'analytics'}
								<path class="nav-item__icon-path" d="M18 20V10M12 20V4M6 20v-6" />
							{:else if item.icon === 'monitoring'}
								<path class="nav-item__icon-path" d="M22 12h-4l-3 9L9 3l-3 9H2" />
							{:else if item.icon === 'playbooks'}
								<path class="nav-item__icon-path" d="M4 7h16M4 12h10M4 17h16" />
								<path class="nav-item__icon-path" d="m17 9 3 3-3 3" />
							{:else if item.icon === 'settings'}
								<path class="nav-item__icon-path" d="M12 3v3M12 18v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M3 12h3M18 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12" />
								<circle class="nav-item__icon-circle" cx="12" cy="12" r="3.2" />
							{:else}
								<path class="nav-item__icon-path" d="M14 4h6v6" />
								<path class="nav-item__icon-path" d="M10 14 20 4" />
								<path class="nav-item__icon-path" d="M20 14v6h-6" />
								<path class="nav-item__icon-path" d="M4 10 14 20" />
							{/if}
						</svg>
						<span class="nav-item__label" id={`nav-label-${item.icon}`}>{item.label}</span>
						{#if item.showCount && unreadCount > 0}
							<span class="nav-item__count" id="nav-recovery-count" aria-label={`${unreadCount} at-risk accounts`}>
								{unreadCount > 99 ? '99+' : unreadCount}
							</span>
						{/if}
					</a>
				{/each}
			</nav>
		</div>

		<div class="sidebar__bottom" id="sidebar-bottom">
			{#if clerkReady}
				<SignedIn let:user>
					<div class="sidebar__user" id="sidebar-user">
						<div class="sidebar__user-button" id="sidebar-user-button">
							<UserButton afterSignOutUrl="/" />
						</div>
						<div class="sidebar__user-info" id="sidebar-user-info">
							<p class="sidebar__org-name" id="sidebar-org-name">{orgName}</p>
							<p class="sidebar__user-email" id="sidebar-user-email">
								{user?.primaryEmailAddress?.emailAddress ?? 'Authenticated'}
							</p>
						</div>
					</div>
				</SignedIn>
				<SignedOut>
					<a class="btn btn-primary btn-full" href="/sign-in" id="sidebar-sign-in">
						Sign in
					</a>
				</SignedOut>
			{/if}
		</div>
	</aside>

	<div class="content-column" id="content-column">
		<header class="topbar" id="topbar">
			<div class="topbar__copy" id="topbar-copy">
				<p class="topbar__breadcrumb" id="topbar-breadcrumb">{breadcrumb.join(' / ')}</p>
				<h1 class="topbar__title" id="topbar-title">{title}</h1>
			</div>
			<div class="topbar__actions" id="topbar-actions">
				{#if headerActions}
					{@render headerActions()}
				{/if}
			</div>
		</header>

		<main class="content-area" id="content-area">
			<h1 class="sr-only" id="content-area-title">{title} - ChurnPulse</h1>
			{@render children()}
		</main>
	</div>
</div>
