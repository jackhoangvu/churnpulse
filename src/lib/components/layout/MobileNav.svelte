<script lang="ts">
	import { page } from '$app/state';

	interface Props {
		unreadCount?: number;
	}

	type NavItem = {
		href: string;
		label: string;
		icon: 'dashboard' | 'signals' | 'sequences' | 'settings' | 'docs';
		showBadge?: boolean;
		external?: boolean;
	};

	let { unreadCount = 0 }: Props = $props();

	const nav: NavItem[] = [
		{ href: '/dashboard', label: 'Home', icon: 'dashboard' },
		{ href: '/dashboard/signals', label: 'Signals', icon: 'signals', showBadge: true },
		{ href: '/dashboard/sequences', label: 'Sequences', icon: 'sequences' },
		{ href: '/dashboard/settings', label: 'Settings', icon: 'settings' },
		{ href: '/docs', label: 'Docs', icon: 'docs', external: true }
	] as const;

	const pathname = $derived(page.url.pathname);

	function isActive(href: string, external = false): boolean {
		if (external) {
			return false;
		}

		return pathname === href || pathname.startsWith(`${href}/`);
	}
</script>

<nav class="mobile-nav" aria-label="Mobile navigation" id="mobile-nav">
	<div class="mobile-nav__items" id="mobile-nav-items">
		{#each nav as item (item.href)}
			<a
				class="mobile-nav__item"
				class:mobile-nav__item--active={isActive(item.href, item.external ?? false)}
				href={item.href}
				target={item.external ? '_blank' : undefined}
				rel={item.external ? 'noreferrer' : undefined}
				aria-label={item.label}
				id={`mobile-nav-${item.icon}`}
			>
				{#if item.showBadge && unreadCount > 0}
					<span class="mobile-nav__badge" aria-label={`${unreadCount} unread signals`} id={`mobile-badge-${item.icon}`}>
						{unreadCount > 9 ? '9+' : unreadCount}
					</span>
				{/if}
				<svg
					class="mobile-nav__icon"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.7"
					aria-hidden="true"
					id={`mobile-icon-${item.icon}`}
				>
					{#if item.icon === 'dashboard'}
						<path class="mobile-nav__path" d="M4 4h7v7H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 13h7v7H4z" />
					{:else if item.icon === 'signals'}
						<path class="mobile-nav__path" d="M3 12h4l2.2-5 3.6 10L15 10l1.5 2H21" />
					{:else if item.icon === 'sequences'}
						<path class="mobile-nav__path" d="M4 7h16M4 12h10M4 17h16" />
						<path class="mobile-nav__path" d="m17 9 3 3-3 3" />
					{:else if item.icon === 'settings'}
						<path
							class="mobile-nav__path"
							d="M12 3v3M12 18v3M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M3 12h3M18 12h3M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"
						/>
						<circle class="mobile-nav__circle" cx="12" cy="12" r="3.2" />
					{:else}
						<path class="mobile-nav__path" d="M14 4h6v6" />
						<path class="mobile-nav__path" d="M10 14 20 4" />
						<path class="mobile-nav__path" d="M20 14v6h-6" />
						<path class="mobile-nav__path" d="M4 10 14 20" />
					{/if}
				</svg>
				<span class="mobile-nav__label" id={`mobile-label-${item.icon}`}>{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
