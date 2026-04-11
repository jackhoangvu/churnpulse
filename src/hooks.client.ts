import { env } from '$env/dynamic/public';
import { initializeClerkClient } from 'clerk-sveltekit/client';

if (env.PUBLIC_CLERK_PUBLISHABLE_KEY) {
	void initializeClerkClient(env.PUBLIC_CLERK_PUBLISHABLE_KEY, {
		afterSignInUrl: '/dashboard',
		afterSignUpUrl: '/dashboard',
		signInUrl: '/sign-in',
		signUpUrl: '/sign-up'
	});
}
