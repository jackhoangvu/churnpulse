<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import SignedIn from 'clerk-sveltekit/client/SignedIn.svelte';
	import SignedOut from 'clerk-sveltekit/client/SignedOut.svelte';
	import UserButton from 'clerk-sveltekit/client/UserButton.svelte';
	import type { Snippet } from 'svelte';
	import PageTransition from '$lib/components/layout/PageTransition.svelte';
	import MobileNav from '$lib/components/layout/MobileNav.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import ThemeToggle from '$lib/components/ui/ThemeToggle.svelte';

	type NavItem = {
		label: string;
		href: string;
		icon: 'dashboard' | 'recovery' | 'analytics' | 'monitoring' | 'playbooks' | 'settings' | 'docs';
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
		{ label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
		{ label: 'Recovery Center', href: '/dashboard/recovery', icon: 'recovery', showCount: true },
		{ label: 'Analytics', href: '/dashboard/analytics', icon: 'analytics' },
		{ label: 'Model Health', href: '/dashboard/monitoring', icon: 'monitoring' },
		{ label: 'Recovery Playbooks', href: '/dashboard/playbooks', icon: 'playbooks' },
		{ label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
		{ label: 'Docs', href: '/docs', icon: 'docs', external: true }
	];

	let { orgName = 'ChurnPulse account', userEmail = null, unreadCount = 0, children, headerActions }: Props = $props();
	let clerkReady = $state(false);
	let navElement = $state<HTMLElement | null>(null);
	let inkBarTop = $state(0);
	let inkBarHeight = $state(0);

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

	function updateInkBar(): void {
		if (!navElement) {
			return;
		}

		const activeItem = navElement.querySelector<HTMLElement>('.nav-item--active');
		if (!activeItem) {
			inkBarTop = 0;
			inkBarHeight = 0;
			return;
		}

		inkBarTop = activeItem.offsetTop;
		inkBarHeight = activeItem.offsetHeight;
	}

	onMount(() => {
		clerkReady = true;
		updateInkBar();
		window.addEventListener('resize', updateInkBar);

		return () => {
			window.removeEventListener('resize', updateInkBar);
		};
	});

	$effect(() => {
		pathname;
		updateInkBar();
	});
</script>

<div class="app-shell">
	<aside class="sidebar" aria-label="Primary navigation">
		<a class="sidebar__logo" href="/dashboard" aria-label="ChurnPulse home">
			<Icon class="sidebar__logo-icon" name="bolt" size={18} />
			<span class="sidebar__wordmark">Churn<em>Pulse</em></span>
		</a>

		<div class="sidebar__section">
			<span class="sidebar__section-label">Account</span>
			<nav class="sidebar__nav" bind:this={navElement} aria-label="Main navigation">
				<span class="sidebar__ink-bar" aria-hidden="true" style={`top:${inkBarTop}px;height:${inkBarHeight}px;`}></span>
				{#each navItems as item (item.href)}
					<a
						class="nav-item"
						class:nav-item--active={isActive(item.href, item.external)}
						href={item.href}
						target={item.external ? '_blank' : undefined}
						rel={item.external ? 'noreferrer' : undefined}
						aria-current={isActive(item.href, item.external) ? 'page' : undefined}
					>
						<Icon class="nav-item__icon" name={item.icon} />
						<span class="nav-item__label">{item.label}</span>
						{#if item.showCount && unreadCount > 0}
							<span class="nav-item__count" aria-label={`${unreadCount} open risk alerts`}>
								{unreadCount > 99 ? '99+' : unreadCount}
							</span>
						{/if}
					</a>
				{/each}
			</nav>
		</div>

		<div class="sidebar__bottom">
			{#if clerkReady}
				<SignedIn let:user>
					<div class="sidebar__user">
						<div class="sidebar__user-button">
							<UserButton afterSignOutUrl="/" />
						</div>
						<div class="sidebar__user-info">
							<p class="sidebar__org-name">{orgName}</p>
							<p class="sidebar__user-email">
								{userEmail ?? user?.primaryEmailAddress?.emailAddress ?? 'Authenticated'}
							</p>
						</div>
					</div>
				</SignedIn>
				<SignedOut>
					<a class="btn btn-primary btn-full" href="/sign-in">
						Sign in
					</a>
				</SignedOut>
			{/if}
		</div>
	</aside>

	<div class="content-column">
		<header class="topbar">
			<div class="topbar__copy">
				<p class="topbar__breadcrumb">
					{#each breadcrumb as crumb, index (crumb)}
						<span>{crumb}</span>
						{#if index < breadcrumb.length - 1}
							<Icon name="chevron-right" size={12} />
						{/if}
					{/each}
				</p>
				<p class="topbar__title">{title}</p>
			</div>
			<div class="topbar__actions">
				<ThemeToggle size="sm" />
				{#if headerActions}
					{@render headerActions()}
				{/if}
			</div>
		</header>

		<main class="content-area" id="main-content" tabindex="-1">
			<PageTransition>
				{@render children()}
			</PageTransition>
		</main>

		<MobileNav {unreadCount} />
	</div>
</div>
