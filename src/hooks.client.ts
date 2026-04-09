import { PUBLIC_CLERK_PUBLISHABLE_KEY } from '$env/static/public';
import { initializeClerkClient } from 'clerk-sveltekit/client';

void initializeClerkClient(PUBLIC_CLERK_PUBLISHABLE_KEY, {
	afterSignInUrl: '/dashboard',
	afterSignUpUrl: '/dashboard',
	signInUrl: '/sign-in',
	signUpUrl: '/sign-up'
});
