import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import {
	createBrowserClient as createSupabaseBrowserClient,
	createServerClient as createSupabaseServerClient
} from '@supabase/ssr';
import type { Database } from '$lib/types/supabase';

export type { Database } from '$lib/types/supabase';

export const createBrowserClient = () =>
	createSupabaseBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

export const createServerClient = (fetch: typeof globalThis.fetch) =>
	createSupabaseServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: {
			fetch
		},
		cookies: {
			getAll: () => [],
			setAll: () => undefined
		}
	});
