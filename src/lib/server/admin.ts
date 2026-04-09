import { createClient } from '@supabase/supabase-js';
import { env } from '$lib/env';
import type { Database } from '$lib/types/supabase';

export const admin = createClient<Database, 'public'>(env.supabaseUrl, env.supabaseServiceRoleKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});
