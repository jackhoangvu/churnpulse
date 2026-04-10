import type { Provider, SignalType } from '$lib/types';

export interface NormalizedEvent {
	provider: Provider;
	event_type: SignalType;
	customer_id: string;
	customer_email: string | null;
	customer_name: string | null;
	mrr_cents: number;
	event_id: string;
	metadata: Record<string, unknown>;
	raw: unknown;
}

export function normalizeStripeEvent(event: Record<string, unknown>): NormalizedEvent | null {
	const data = ((event.data as Record<string, unknown>) ?? {}) as Record<string, unknown>;
	const obj = ((data.object as Record<string, unknown>) ?? {}) as Record<string, unknown>;
	const eventId = String(event.id ?? '');
	const eventType = String(event.type ?? '');

	if (eventType === 'invoice.payment_failed') {
		const customerId = extractString(obj.customer);
		if (!customerId) {
			return null;
		}

		return {
			provider: 'stripe',
			event_type: 'card_failed',
			customer_id: customerId,
			customer_email: extractString(obj.customer_email),
			customer_name: extractString(obj.customer_name),
			mrr_cents: extractNumber(obj.amount_due),
			event_id: eventId,
			metadata: {
				invoice_id: obj.id,
				attempt_count: obj.attempt_count,
				currency: obj.currency ?? 'usd'
			},
			raw: event
		};
	}

	if (eventType === 'customer.subscription.updated') {
		const customerId = extractString(obj.customer);
		if (!customerId) {
			return null;
		}

		const previous =
			((data.previous_attributes as Record<string, unknown>) ?? {}) as Record<string, unknown>;
		const currentMrr = extractSubscriptionMrr(obj.items);
		const previousMrr = extractSubscriptionMrr(previous.items);

		if (previousMrr <= 0 || currentMrr >= previousMrr) {
			return null;
		}

		const percentDecrease = ((previousMrr - currentMrr) / previousMrr) * 100;
		if (percentDecrease <= 20) {
			return null;
		}

		return {
			provider: 'stripe',
			event_type: 'downgraded',
			customer_id: customerId,
			customer_email: null,
			customer_name: null,
			mrr_cents: currentMrr,
			event_id: eventId,
			metadata: {
				previous_mrr: previousMrr,
				new_mrr: currentMrr,
				percent_decrease: Number(percentDecrease.toFixed(2))
			},
			raw: event
		};
	}

	if (eventType === 'customer.subscription.paused') {
		const customerId = extractString(obj.customer);
		if (!customerId || !obj.pause_collection) {
			return null;
		}

		return {
			provider: 'stripe',
			event_type: 'paused',
			customer_id: customerId,
			customer_email: null,
			customer_name: null,
			mrr_cents: extractSubscriptionMrr(obj.items),
			event_id: eventId,
			metadata: { subscription_id: obj.id },
			raw: event
		};
	}

	if (eventType === 'customer.subscription.deleted') {
		const customerId = extractString(obj.customer);
		if (!customerId) {
			return null;
		}

		return {
			provider: 'stripe',
			event_type: 'cancelled',
			customer_id: customerId,
			customer_email: null,
			customer_name: null,
			mrr_cents: extractSubscriptionMrr(obj.items),
			event_id: eventId,
			metadata: { subscription_id: obj.id, canceled_at: obj.canceled_at },
			raw: event
		};
	}

	if (eventType === 'customer.subscription.trial_will_end') {
		const customerId = extractString(obj.customer);
		const trialEnd = extractNumber(obj.trial_end) * 1000;
		if (!customerId || trialEnd > Date.now() + 3 * 24 * 60 * 60 * 1000) {
			return null;
		}

		return {
			provider: 'stripe',
			event_type: 'trial_ending',
			customer_id: customerId,
			customer_email: null,
			customer_name: null,
			mrr_cents: extractSubscriptionMrr(obj.items),
			event_id: eventId,
			metadata: {
				trial_end: new Date(trialEnd).toISOString(),
				subscription_id: obj.id
			},
			raw: event
		};
	}

	return null;
}

export function normalizePaddleEvent(event: Record<string, unknown>): NormalizedEvent | null {
	const eventType = String(event.event_type ?? '');
	const data = ((event.data as Record<string, unknown>) ?? {}) as Record<string, unknown>;
	const customer = ((data.customer as Record<string, unknown>) ?? {}) as Record<string, unknown>;
	const eventId = String(event.notification_id ?? event.id ?? '');
	const customerId = extractString(data.customer_id);

	if (!customerId) {
		return null;
	}

	const customerEmail = extractString(customer.email);
	const customerName = extractString(customer.name);

	if (eventType === 'transaction.payment_failed') {
		const totals =
			((((data.details as Record<string, unknown>) ?? {}).totals as Record<string, unknown>) ??
				{}) as Record<string, unknown>;

		return {
			provider: 'paddle',
			event_type: 'card_failed',
			customer_id: customerId,
			customer_email: customerEmail,
			customer_name: customerName,
			mrr_cents: extractNumber(totals.total),
			event_id: eventId,
			metadata: { transaction_id: data.id, currency: data.currency_code },
			raw: event
		};
	}

	if (eventType === 'subscription.updated') {
		const items = Array.isArray(data.items) ? data.items : [];
		const previousData =
			((data.previous_data as Record<string, unknown>) ?? {}) as Record<string, unknown>;
		const previousItems = Array.isArray(previousData.items) ? previousData.items : [];
		const currentMrr = extractPaddleMrr(items);
		const previousMrr = extractPaddleMrr(previousItems);

		if (previousMrr > 0 && currentMrr < previousMrr) {
			const percentDecrease = ((previousMrr - currentMrr) / previousMrr) * 100;

			if (percentDecrease > 20) {
				return {
					provider: 'paddle',
					event_type: 'downgraded',
					customer_id: customerId,
					customer_email: customerEmail,
					customer_name: customerName,
					mrr_cents: currentMrr,
					event_id: eventId,
					metadata: {
						subscription_id: data.id,
						previous_mrr: previousMrr,
						new_mrr: currentMrr
					},
					raw: event
				};
			}
		}

		if (data.status === 'paused') {
			return {
				provider: 'paddle',
				event_type: 'paused',
				customer_id: customerId,
				customer_email: customerEmail,
				customer_name: customerName,
				mrr_cents: currentMrr,
				event_id: eventId,
				metadata: { subscription_id: data.id },
				raw: event
			};
		}

		return null;
	}

	if (eventType === 'subscription.canceled') {
		const items = Array.isArray(data.items) ? data.items : [];

		return {
			provider: 'paddle',
			event_type: 'cancelled',
			customer_id: customerId,
			customer_email: customerEmail,
			customer_name: customerName,
			mrr_cents: extractPaddleMrr(items),
			event_id: eventId,
			metadata: { subscription_id: data.id },
			raw: event
		};
	}

	if (eventType === 'subscription.trial_end_reminder') {
		const items = Array.isArray(data.items) ? data.items : [];

		return {
			provider: 'paddle',
			event_type: 'trial_ending',
			customer_id: customerId,
			customer_email: customerEmail,
			customer_name: customerName,
			mrr_cents: extractPaddleMrr(items),
			event_id: eventId,
			metadata: {
				subscription_id: data.id,
				trial_ends_at: data.trial_ends_at
			},
			raw: event
		};
	}

	return null;
}

export function normalizeLemonSqueezyEvent(
	event: Record<string, unknown>
): NormalizedEvent | null {
	const meta = ((event.meta as Record<string, unknown>) ?? {}) as Record<string, unknown>;
	const eventName = String(meta.event_name ?? '');
	const data = ((event.data as Record<string, unknown>) ?? {}) as Record<string, unknown>;
	const attrs =
		((data.attributes as Record<string, unknown>) ?? {}) as Record<string, unknown>;
	const eventId = `${eventName}_${String(data.id ?? '')}`;
	const customerId = String(attrs.customer_id ?? data.id ?? '');

	if (eventName === 'subscription_payment_failed') {
		return {
			provider: 'lemonsqueezy',
			event_type: 'card_failed',
			customer_id: customerId,
			customer_email: extractString(attrs.user_email),
			customer_name: extractString(attrs.user_name),
			mrr_cents: extractNumber(attrs.total),
			event_id: eventId,
			metadata: { subscription_id: attrs.subscription_id, order_id: data.id },
			raw: event
		};
	}

	if (eventName === 'subscription_updated') {
		const status = extractString(attrs.status);
		const firstItem =
			((attrs.first_subscription_item as Record<string, unknown>) ?? {}) as Record<
				string,
				unknown
			>;

		if (status === 'past_due') {
			return {
				provider: 'lemonsqueezy',
				event_type: 'card_failed',
				customer_id: customerId,
				customer_email: extractString(attrs.user_email),
				customer_name: extractString(attrs.user_name),
				mrr_cents: extractNumber(firstItem.price ?? 0),
				event_id: eventId,
				metadata: { subscription_id: data.id, reason: 'past_due' },
				raw: event
			};
		}

		if (status === 'paused') {
			return {
				provider: 'lemonsqueezy',
				event_type: 'paused',
				customer_id: customerId,
				customer_email: extractString(attrs.user_email),
				customer_name: extractString(attrs.user_name),
				mrr_cents: extractNumber(firstItem.price ?? 0),
				event_id: eventId,
				metadata: { subscription_id: data.id },
				raw: event
			};
		}

		return null;
	}

	if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
		const firstItem =
			((attrs.first_subscription_item as Record<string, unknown>) ?? {}) as Record<
				string,
				unknown
			>;

		return {
			provider: 'lemonsqueezy',
			event_type: 'cancelled',
			customer_id: customerId,
			customer_email: extractString(attrs.user_email),
			customer_name: extractString(attrs.user_name),
			mrr_cents: extractNumber(firstItem.price ?? 0),
			event_id: eventId,
			metadata: { subscription_id: data.id, reason: eventName },
			raw: event
		};
	}

	return null;
}

export function normalizePolarEvent(event: Record<string, unknown>): NormalizedEvent | null {
	const data = ((event.data as Record<string, unknown>) ?? {}) as Record<string, unknown>;
	const obj = ((data.object as Record<string, unknown>) ?? {}) as Record<string, unknown>;
	const eventType = String(event.type ?? '');
	const eventId = String(event.id ?? '');
	const customerId = extractString(obj.customer_id) ?? extractString(obj.customer);
	const customer =
		((obj.customer as Record<string, unknown>) ?? {}) as Record<string, unknown>;

	if (!customerId) {
		return null;
	}

	if (eventType === 'subscription.canceled' || eventType === 'customer.subscription.deleted') {
		return {
			provider: 'polar',
			event_type: 'cancelled',
			customer_id: customerId,
			customer_email:
				extractString(customer.email) ?? extractString(obj.customer_email),
			customer_name:
				extractString(customer.name) ?? extractString(obj.customer_name),
			mrr_cents: extractNumber(obj.amount) || extractSubscriptionMrr(obj.items),
			event_id: eventId,
			metadata: { subscription_id: obj.id },
			raw: event
		};
	}

	if (eventType === 'invoice.payment_failed') {
		return {
			provider: 'polar',
			event_type: 'card_failed',
			customer_id: customerId,
			customer_email: extractString(obj.customer_email),
			customer_name: extractString(obj.customer_name),
			mrr_cents: extractNumber(obj.amount_due),
			event_id: eventId,
			metadata: { invoice_id: obj.id },
			raw: event
		};
	}

	if (eventType === 'customer.subscription.updated') {
		const previous =
			((data.previous_attributes as Record<string, unknown>) ?? {}) as Record<string, unknown>;
		const currentMrr = extractSubscriptionMrr(obj.items);
		const previousMrr = extractSubscriptionMrr(previous.items);

		if (previousMrr <= 0 || currentMrr >= previousMrr) {
			return null;
		}

		const percentDecrease = ((previousMrr - currentMrr) / previousMrr) * 100;
		if (percentDecrease <= 20) {
			return null;
		}

		return {
			provider: 'polar',
			event_type: 'downgraded',
			customer_id: customerId,
			customer_email:
				extractString(customer.email) ?? extractString(obj.customer_email),
			customer_name:
				extractString(customer.name) ?? extractString(obj.customer_name),
			mrr_cents: currentMrr,
			event_id: eventId,
			metadata: {
				previous_mrr: previousMrr,
				new_mrr: currentMrr,
				percent_decrease: Number(percentDecrease.toFixed(2)),
				subscription_id: obj.id
			},
			raw: event
		};
	}

	if (eventType === 'customer.subscription.paused') {
		return {
			provider: 'polar',
			event_type: 'paused',
			customer_id: customerId,
			customer_email:
				extractString(customer.email) ?? extractString(obj.customer_email),
			customer_name:
				extractString(customer.name) ?? extractString(obj.customer_name),
			mrr_cents: extractSubscriptionMrr(obj.items),
			event_id: eventId,
			metadata: { subscription_id: obj.id },
			raw: event
		};
	}

	if (eventType === 'customer.subscription.trial_will_end') {
		const trialEnd = extractNumber(obj.trial_end) * 1000;
		if (trialEnd > Date.now() + 3 * 24 * 60 * 60 * 1000) {
			return null;
		}

		return {
			provider: 'polar',
			event_type: 'trial_ending',
			customer_id: customerId,
			customer_email:
				extractString(customer.email) ?? extractString(obj.customer_email),
			customer_name:
				extractString(customer.name) ?? extractString(obj.customer_name),
			mrr_cents: extractSubscriptionMrr(obj.items),
			event_id: eventId,
			metadata: {
				subscription_id: obj.id,
				trial_end: new Date(trialEnd).toISOString()
			},
			raw: event
		};
	}

	return null;
}

function extractString(value: unknown): string | null {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function extractNumber(value: unknown): number {
	const numericValue = Number(value);
	return Number.isFinite(numericValue) ? numericValue : 0;
}

function extractSubscriptionMrr(items: unknown): number {
	if (!items || typeof items !== 'object') {
		return 0;
	}

	const data = (items as Record<string, unknown>).data;
	if (!Array.isArray(data)) {
		return 0;
	}

	return data.reduce((total, item) => {
		const normalizedItem = (item as Record<string, unknown>) ?? {};
		const quantity = extractNumber(normalizedItem.quantity) || 1;
		const price =
			((normalizedItem.price as Record<string, unknown>) ?? {}) as Record<string, unknown>;

		return total + extractNumber(price.unit_amount) * quantity;
	}, 0);
}

function extractPaddleMrr(items: unknown[]): number {
	return items.reduce((total: number, item) => {
		const normalizedItem = (item as Record<string, unknown>) ?? {};
		const price =
			((normalizedItem.price as Record<string, unknown>) ?? {}) as Record<string, unknown>;
		const unitPrice =
			((price.unit_price as Record<string, unknown>) ?? {}) as Record<string, unknown>;

		return total + extractNumber(unitPrice.amount);
	}, 0);
}
