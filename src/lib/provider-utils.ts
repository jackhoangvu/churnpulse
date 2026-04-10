import type { Json, Provider, ProviderConnection } from '$lib/types/supabase';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProvider(value: unknown): value is Provider {
	return (
		value === 'stripe' ||
		value === 'paddle' ||
		value === 'lemonsqueezy' ||
		value === 'polar'
	);
}

function normalizeProviderConnection(value: unknown): ProviderConnection | null {
	if (!isRecord(value) || !isProvider(value.type)) {
		return null;
	}

	const accountId = typeof value.account_id === 'string' ? value.account_id.trim() : '';
	const accessToken = typeof value.access_token === 'string' ? value.access_token : '';
	const webhookSecret = typeof value.webhook_secret === 'string' ? value.webhook_secret : '';
	const connectedAt = typeof value.connected_at === 'string' ? value.connected_at : '';
	const status = value.status === 'error' ? 'error' : value.status === 'active' ? 'active' : null;

	if (!accountId || !connectedAt || !status) {
		return null;
	}

	const connection: ProviderConnection = {
		type: value.type,
		account_id: accountId,
		access_token: accessToken,
		webhook_secret: webhookSecret,
		connected_at: connectedAt,
		status
	};

	if (typeof value.refresh_token === 'string') {
		connection.refresh_token = value.refresh_token;
	}

	if (typeof value.error_message === 'string') {
		connection.error_message = value.error_message;
	}

	if (typeof value.label === 'string') {
		connection.label = value.label;
	}

	return connection;
}

export function parseProviderConnections(value: Json | null): ProviderConnection[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((entry) => normalizeProviderConnection(entry))
		.filter((entry): entry is ProviderConnection => entry !== null);
}

export function getProviderConnection(
	value: Json | null,
	type: Provider
): ProviderConnection | null {
	return parseProviderConnections(value).find((connection) => connection.type === type) ?? null;
}

export function upsertProviderConnection(
	value: Json | null,
	connection: ProviderConnection
): ProviderConnection[] {
	const filtered = parseProviderConnections(value).filter(
		(existingConnection) => existingConnection.type !== connection.type
	);
	filtered.push(connection);
	return filtered;
}

export function removeProviderConnection(
	value: Json | null,
	type: Provider
): ProviderConnection[] {
	return parseProviderConnections(value).filter((connection) => connection.type !== type);
}

export function organizationHasActiveProvider(value: Json | null): boolean {
	return parseProviderConnections(value).some((connection) => connection.status === 'active');
}
