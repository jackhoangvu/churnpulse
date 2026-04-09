<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { page } from '$app/state';
	import { writable } from 'svelte/store';
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
		{ label: 'Docs', href: 'https://docs.churnpulse.app', icon: 'docs', external: true }
	];

	let { orgName = 'Connected Stripe workspace', children, headerActions }: Props = $props();
	let clerkReady = $state(false);
	const fallbackUnreadSignalCount = writable(0);
	const dashboardContext = getContext<DashboardLayoutContext | undefined>(dashboardLayoutContextKey);
	const unreadSignalCount =
		dashboardContext?.unreadSignalCount ?? fallbackUnreadSignalCount;

	const pathname = $derived(page.url.pathname);
	const title = $derived(
		page.data.title ??
			navItems.find((item) => !item.external && pathname.startsWith(item.href))?.label ??
			'Control Center'
	);
	const breadcrumb = $derived(page.data.breadcrumb ?? ['ChurnPulse', title]);

	const isActive = (href: string, external = false) =>
		!external && (pathname === href || pathname.startsWith(`${href}/`));

	onMount(() => {
		clerkReady = true;
	});

	$effect(() => {
		if (pathname.startsWith('/dashboard/signals')) {
			unreadSignalCount.set(0);
		}
	});
</script>

<div class="app-shell">
	<aside class="sidebar" aria-label="Primary">
		<div class="sidebar-top">
			<a class="wordmark" href="/dashboard" aria-label="ChurnPulse dashboard">
				<svg
					class="wordmark-bolt"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
				</svg>
				<span class="wordmark-label">ChurnPulse</span>
			</a>
		</div>

		<nav class="sidebar-nav">
			{#each navItems as item (item.href)}
				<a
					class="nav-item"
					class:nav-item-active={isActive(item.href, item.external)}
					href={item.href}
					target={item.external ? '_blank' : undefined}
					rel={item.external ? 'noreferrer' : undefined}
				>
					<span class="nav-icon" aria-hidden="true">
						{#if item.icon === 'dashboard'}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
								<path d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z" />
							</svg>
						{:else if item.icon === 'signals'}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
								<path d="M3 12h4l2.2-5 3.6 10L15 10l1.5 2H21" />
							</svg>
						{:else if item.icon === 'sequences'}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
								<path d="M4 7h16M4 12h10M4 17h16" />
								<path d="m17 9 3 3-3 3" />
							</svg>
						{:else if item.icon === 'settings'}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
								<path
									d="M12 3v3M12 18v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M3 12h3M18 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
								/>
								<circle cx="12" cy="12" r="3.2" />
							</svg>
						{:else}
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
								<path d="M14 4h6v6" />
								<path d="M10 14 20 4" />
								<path d="M20 14v6h-6" />
								<path d="M4 10 14 20" />
							</svg>
						{/if}
					</span>
					<span class="nav-label">
						{item.label}
						{#if item.icon === 'signals' && $unreadSignalCount > 0}
							<span class="nav-counter">{$unreadSignalCount}</span>
						{/if}
					</span>
				</a>
			{/each}
		</nav>

		<div class="sidebar-bottom">
			{#if clerkReady}
				<SignedIn let:user>
					<div class="org-block">
						<div class="org-copy">
							<p class="org-name">{orgName}</p>
							<p class="org-user">
								{user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Authenticated operator'}
							</p>
						</div>
						<div class="org-actions">
							<UserButton afterSignOutUrl="/" />
							<svg
								class="caret"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.7"
								aria-hidden="true"
							>
								<path d="m6 9 6 6 6-6" />
							</svg>
						</div>
					</div>
				</SignedIn>

				<SignedOut>
					<a class="auth-link" href="/sign-in">Authenticate with Clerk</a>
				</SignedOut>
			{:else}
				<div class="org-block">
					<div class="org-copy">
						<p class="org-name">{orgName}</p>
						<p class="org-user">Authenticated operator</p>
					</div>
					<div class="org-actions">
						<div class="avatar-shell" aria-hidden="true">CP</div>
						<svg
							class="caret"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="1.7"
							aria-hidden="true"
						>
							<path d="m6 9 6 6 6-6" />
						</svg>
					</div>
				</div>
			{/if}
		</div>
	</aside>

	<div class="content-column">
		<header class="topbar">
			<div>
				<p class="breadcrumb">{breadcrumb.join(' / ')}</p>
				<h1 class="page-title">{title}</h1>
			</div>

			<div class="header-actions">
				{#if headerActions}
					{@render headerActions()}
				{/if}
			</div>
		</header>

		<main class="content-area">
			{@render children()}
		</main>
	</div>
</div>

<style>
	.app-shell {
		display: flex;
		min-height: 100vh;
		background: var(--bg-base);
		color: var(--text-primary);
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		width: 220px;
		border-right: 1px solid var(--border-subtle);
		background:
			linear-gradient(180deg, rgba(255, 255, 255, 0.02), transparent 24%),
			var(--bg-surface);
	}

	.sidebar-top {
		padding: 1rem 1rem 0.85rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.wordmark {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 1rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent-cyan);
	}

	.wordmark-bolt {
		width: 1rem;
		height: 1rem;
		flex: none;
	}

	.sidebar-nav {
		display: flex;
		flex: 1;
		flex-direction: column;
		padding: 0.75rem 0;
	}

	.nav-item {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.8rem;
		min-height: 2.75rem;
		padding: 0 1rem 0 1.125rem;
		border-left: 2px solid transparent;
		color: var(--text-secondary);
		transition:
			background-color 160ms ease,
			border-color 160ms ease,
			color 160ms ease;
	}

	.nav-item:hover {
		border-left-color: var(--accent-cyan);
		background: var(--bg-elevated);
		color: var(--text-primary);
	}

	.nav-item-active {
		border-left-color: var(--accent-cyan);
		background: rgba(0, 229, 255, 0.08);
		color: var(--text-primary);
	}

	.nav-icon {
		display: inline-flex;
		width: 1rem;
		height: 1rem;
		flex: none;
	}

	.nav-icon :global(svg) {
		width: 100%;
		height: 100%;
	}

	.nav-label {
		display: inline-flex;
		align-items: center;
		gap: 0.55rem;
		font-size: 0.92rem;
		font-weight: 500;
	}

	.nav-counter {
		display: inline-flex;
		min-width: 1.1rem;
		align-items: center;
		justify-content: center;
		padding: 0.12rem 0.35rem;
		border: 1px solid var(--accent-cyan-border);
		background: rgba(0, 229, 255, 0.1);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.66rem;
		line-height: 1;
		color: var(--accent-cyan);
	}

	.sidebar-bottom {
		padding: 1rem;
		border-top: 1px solid var(--border-subtle);
	}

	.org-block {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem;
		border: 1px solid var(--border-default);
		background: var(--bg-elevated);
	}

	.org-copy {
		min-width: 0;
	}

	.org-name,
	.org-user,
	.breadcrumb {
		margin: 0;
	}

	.org-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.org-user {
		margin-top: 0.2rem;
		font-size: 0.74rem;
		color: var(--text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.org-actions {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.caret {
		width: 0.9rem;
		height: 0.9rem;
		color: var(--text-secondary);
	}

	.auth-link {
		display: block;
		padding: 0.75rem;
		border: 1px solid var(--border-default);
		background: var(--bg-elevated);
		font-size: 0.86rem;
		color: var(--text-primary);
	}

	.avatar-shell {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border: 1px solid var(--border-default);
		border-radius: 999px;
		background: rgba(0, 229, 255, 0.08);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.72rem;
		color: var(--accent-cyan);
	}

	.content-column {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
	}

	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 48px;
		padding: 0.7rem 1.5rem;
		border-bottom: 1px solid var(--border-subtle);
		background: rgba(10, 10, 11, 0.84);
		backdrop-filter: blur(14px);
	}

	.breadcrumb {
		font-family: 'IBM Plex Mono', monospace;
		font-size: 0.68rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.page-title {
		margin: 0.18rem 0 0;
		font-size: 1rem;
		font-weight: 600;
		color: white;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.content-area {
		flex: 1;
		overflow-y: auto;
		padding: 0;
	}

	:global(.sidebar-bottom .cl-userButtonTrigger) {
		border: 1px solid var(--border-default);
		border-radius: 999px;
	}

	@media (max-width: 767px) {
		.sidebar {
			width: 76px;
		}

		.wordmark-label,
		.nav-label,
		.org-copy,
		.caret {
			display: none;
		}

		.sidebar-top,
		.sidebar-bottom {
			padding-inline: 0.75rem;
		}

		.wordmark,
		.nav-item,
		.org-block {
			justify-content: center;
		}

		.nav-item {
			padding-inline: 0;
		}

		.topbar {
			padding-inline: 1rem;
		}
	}
</style>
