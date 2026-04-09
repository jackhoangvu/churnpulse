import { env } from '$lib/env';
import type { ChurnSignal, SequenceEmail } from '$lib/types';

type LogLevel = 'info' | 'warn' | 'error';

const ANSI = {
	reset: '\u001B[0m',
	gray: '\u001B[90m',
	cyan: '\u001B[36m',
	yellow: '\u001B[33m',
	red: '\u001B[31m'
} as const;

function getColor(level: LogLevel): string {
	if (level === 'info') {
		return ANSI.cyan;
	}

	if (level === 'warn') {
		return ANSI.yellow;
	}

	return ANSI.red;
}

function serializeError(error: unknown): Record<string, unknown> {
	if (error instanceof Error) {
		return {
			error_name: error.name,
			error_message: error.message,
			error_stack: error.stack
		};
	}

	return {
		error_message: String(error)
	};
}

export function log(
	level: LogLevel,
	context: string,
	message: string,
	data: Record<string, unknown> = {}
): void {
	const entry = {
		timestamp: new Date().toISOString(),
		level,
		context,
		message,
		...data
	};

	if (env.nodeEnv === 'production') {
		const output = JSON.stringify(entry);

		if (level === 'error') {
			console.error(output);
			return;
		}

		if (level === 'warn') {
			console.warn(output);
			return;
		}

		console.log(output);
		return;
	}

	const color = getColor(level);
	const prefix = `${ANSI.gray}${entry.timestamp}${ANSI.reset} ${color}${level.toUpperCase()}${ANSI.reset} ${ANSI.gray}[${context}]${ANSI.reset}`;

	if (Object.keys(data).length > 0) {
		console.log(`${prefix} ${message}`, data);
		return;
	}

	console.log(`${prefix} ${message}`);
}

export function logSignalDetected(signal: ChurnSignal, org_id: string): void {
	log('info', 'signal', 'Signal detected', {
		org_id,
		type: signal.signal_type,
		customer: signal.customer_email,
		mrr: signal.mrr_amount
	});
}

export function logEmailSent(email: SequenceEmail, signal_id: string): void {
	log('info', 'email', 'Sequence email sent', {
		email_id: email.id,
		signal_id,
		step: email.step,
		email_to: email.email_to,
		status: email.status
	});
}

export function logError(
	context: string,
	error: unknown,
	data: Record<string, unknown> = {}
): void {
	log('error', context, 'Unhandled error', {
		...serializeError(error),
		...data
	});
}
