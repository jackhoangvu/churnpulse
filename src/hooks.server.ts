import { CLERK_SECRET_KEY } from '$env/static/private';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { handleClerk } from 'clerk-sveltekit/server';

const PUBLIC_ROUTES = new Set([
	'/',
	'/sign-in',
	'/sign-up',
	'/api/webhooks/stripe',
	'/api/stripe/callback'
]);

const isDashboardRoute = (pathname: string) =>
	pathname === '/dashboard' || pathname.startsWith('/dashboard/');

const isPublicRoute = (pathname: string) => PUBLIC_ROUTES.has(pathname);

const protectDashboardRoutes: Handle = async ({ event, resolve }) => {
	if (isPublicRoute(event.url.pathname) || !isDashboardRoute(event.url.pathname)) {
		return resolve(event);
	}

	if (event.locals.session) {
		return resolve(event);
	}

	const signInUrl = new URL('/sign-in', event.url.origin);
	signInUrl.searchParams.set('redirectUrl', `${event.url.pathname}${event.url.search}`);

	return Response.redirect(signInUrl, 307);
};

export const handle: Handle = sequence(
	handleClerk(CLERK_SECRET_KEY, {
		signInUrl: '/sign-in'
	}),
	protectDashboardRoutes
);
