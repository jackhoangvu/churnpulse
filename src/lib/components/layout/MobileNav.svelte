<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/ui/Icon.svelte';

	interface Props {
		unreadCount?: number;
	}

	type NavItem = {
		href: string;
		label: string;
		icon: 'dashboard' | 'recovery' | 'playbooks' | 'settings' | 'docs';
		showBadge?: boolean;
		external?: boolean;
	};

	let { unreadCount = 0 }: Props = $props();

	const nav: NavItem[] = [
		{ href: '/dashboard', label: 'Home', icon: 'dashboard' },
		{ href: '/dashboard/recovery', label: 'Recovery', icon: 'recovery', showBadge: true },
		{ href: '/dashboard/playbooks', label: 'Playbooks', icon: 'playbooks' },
		{ href: '/dashboard/settings', label: 'Settings', icon: 'settings' },
		{ href: '/docs', label: 'Docs', icon: 'docs', external: true }
	] as const;

	const pathname = $derived(page.url.pathname);
	const activeIndex = $derived.by(() => {
		const index = nav.findIndex((item) => isActive(item.href, item.external ?? false));
		return index === -1 ? 0 : index;
	});

	function isActive(href: string, external = false): boolean {
		if (external) {
			return false;
		}

		return pathname === href || pathname.startsWith(`${href}/`);
	}
</script>

<nav class="mobile-nav" aria-label="Mobile navigation" id="mobile-nav">
	<div class="mobile-nav__indicator" style={`transform: translateX(${activeIndex * 100}%);`}></div>
	<div class="mobile-nav__items" id="mobile-nav-items">
		{#each nav as item (item.href)}
			<a
				class="mobile-nav__item"
				class:mobile-nav__item--active={isActive(item.href, item.external ?? false)}
				href={item.href}
				target={item.external ? '_blank' : undefined}
				rel={item.external ? 'noreferrer' : undefined}
				aria-label={item.label}
				aria-current={isActive(item.href, item.external ?? false) ? 'page' : undefined}
				id={`mobile-nav-${item.icon}`}
			>
				{#if item.showBadge && unreadCount > 0}
					<span class="mobile-nav__badge" aria-label={`${unreadCount} unread signals`} id={`mobile-badge-${item.icon}`}>
						{unreadCount > 9 ? '9+' : unreadCount}
					</span>
				{/if}
				<Icon class="mobile-nav__icon" name={item.icon === 'docs' ? 'docs' : item.icon} size={18} />
				<span class="mobile-nav__label" id={`mobile-label-${item.icon}`} aria-hidden="true">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
