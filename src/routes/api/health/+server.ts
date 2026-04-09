import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { healthCheck } from '$lib/server/health';

export const GET: RequestHandler = async () => {
	return json(await healthCheck());
};
