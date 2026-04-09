import { createClient } from '@supabase/supabase-js';
import { logger, schedules } from '@trigger.dev/sdk/v3';
import { env } from '$lib/env';
import { sendSequenceEmail } from '$lib/server/email-sender';
import type { Database, SequenceEmailRow } from '$lib/types/supabase';

const admin = createClient<Database, 'public'>(env.supabaseUrl, env.supabaseServiceRoleKey, {
	auth: {
		autoRefreshToken: false,
		persistSession: false
	}
});

function serializeError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	return String(error);
}

export const sendScheduledEmails = schedules.task({
	id: 'send-scheduled-emails',
	cron: '*/15 * * * *',
	run: async () => {
		try {
			const now = new Date().toISOString();
			const { data, error } = await admin
				.from('sequence_emails')
				.select('id, signal_id, scheduled_for')
				.eq('status', 'pending')
				.lte('scheduled_for', now)
				.order('scheduled_for', { ascending: true })
				.limit(50);
			const rows = data as unknown as Pick<SequenceEmailRow, 'id' | 'signal_id' | 'scheduled_for'>[] | null;

			if (error) {
				throw error;
			}

			let sent = 0;
			let failed = 0;

			for (const row of rows ?? []) {
				try {
					await sendSequenceEmail(row.id);

					const { data: updatedRow, error: statusError } = await admin
						.from('sequence_emails')
						.select('status')
						.eq('id', row.id)
						.maybeSingle();
					const typedUpdatedRow = updatedRow as unknown as Pick<SequenceEmailRow, 'status'> | null;

					if (statusError) {
						throw statusError;
					}

					if (typedUpdatedRow?.status === 'sent') {
						sent += 1;
						logger.info('Scheduled email sent', {
							job: 'send-scheduled-emails',
							error: null,
							signal_id: row.signal_id
						});
					} else {
						failed += 1;
						logger.error('Scheduled email failed', {
							job: 'send-scheduled-emails',
							error: `Unexpected final status: ${typedUpdatedRow?.status ?? 'unknown'}`,
							signal_id: row.signal_id
						});
					}
				} catch (error) {
					failed += 1;
					logger.error('Scheduled email failed', {
						job: 'send-scheduled-emails',
						error: serializeError(error),
						signal_id: row.signal_id
					});
				}
			}

			return { sent, failed };
		} catch (error) {
			logger.error('Scheduled email batch failed', {
				job: 'send-scheduled-emails',
				error: serializeError(error),
				signal_id: null
			});

			return { sent: 0, failed: 0 };
		}
	}
});
