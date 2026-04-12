import { env } from '$lib/env';
import type { Organization } from '$lib/types';
import { getPolarAccessToken } from '$lib/provider-utils';

type ErrorDetails = {
	status: number;
	code?: string;
	publicMessage: string;
	internalMessage?: string;
};

class ApiError extends Error {
	status: number;
	code?: string | undefined;

	constructor(details: ErrorDetails) {
		super(details.internalMessage ?? details.publicMessage);
		this.name = 'ApiError';
		this.status = details.status;
		this.code = details.code;
	}
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function isPolarLikeError(error: unknown): error is {
	type?: string;
	message?: string;
	statusCode?: number;
	userMessage?: string;
} {
	return isObject(error) && ('type' in error || 'statusCode' in error || 'userMessage' in error);
}

function isApiError(error: unknown): error is ApiError {
	return error instanceof ApiError;
}

function buildBody(status: number, code: string, message: string, details?: unknown): string {
	const payload: Record<string, unknown> = {
		error: code,
		message
	};

	if (details !== undefined) {
		payload.details = details;
	}

	return JSON.stringify(payload);
}

export function handleApiError(error: unknown): Response {
	if (isApiError(error)) {
		return new Response(buildBody(error.status, error.code ?? 'api_error', error.message), {
			status: error.status,
			headers: { 'content-type': 'application/json' }
		});
	}

	if (isPolarLikeError(error)) {
		const message =
			error.userMessage ??
			'There was a problem talking to Polar. Please try again in a moment.';

		return new Response(buildBody(400, 'polar_error', message), {
			status: 400,
			headers: { 'content-type': 'application/json' }
		});
	}

	if (isObject(error) && (error.status === 401 || error.code === 'unauthorized')) {
		return new Response(buildBody(401, 'unauthorized', 'Authentication is required.'), {
			status: 401,
			headers: { 'content-type': 'application/json' }
		});
	}

	const details =
		env.nodeEnv === 'production'
			? undefined
			: error instanceof Error
				? { name: error.name, message: error.message, stack: error.stack }
				: { value: String(error) };

	return new Response(
		buildBody(500, 'internal_server_error', 'Something went wrong. Please try again shortly.', details),
		{
			status: 500,
			headers: { 'content-type': 'application/json' }
		}
	);
}

export function assertOrg(org: Organization | null): asserts org is Organization {
	if (!org) {
		throw new ApiError({
			status: 401,
			code: 'unauthorized',
			publicMessage: 'Authentication is required.'
		});
	}
}

export function assertPolarConnected(org: Organization): void {
	if (!getPolarAccessToken(org)) {
		throw new ApiError({
			status: 400,
			code: 'polar_not_connected',
			publicMessage: 'Connect your Polar account first'
		});
	}
}
