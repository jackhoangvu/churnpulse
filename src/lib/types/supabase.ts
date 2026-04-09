export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export interface OrganizationRow {
	id: string;
	user_id: string;
	name: string | null;
	metadata: Json | null;
	stripe_account_id: string | null;
	stripe_access_token: string | null;
	stripe_refresh_token: string | null;
	stripe_webhook_secret: string | null;
	created_at: string;
}

export interface ChurnSignalRow {
	id: string;
	org_id: string;
	stripe_customer_id: string;
	customer_email: string | null;
	customer_name: string | null;
	signal_type: string;
	mrr_amount: number;
	stripe_event_id: string | null;
	status: string;
	ai_churn_reason: string | null;
	ai_win_back_angle: string | null;
	metadata: Json | null;
	detected_at: string;
	resolved_at: string | null;
}

export interface SequenceEmailRow {
	id: string;
	signal_id: string;
	org_id: string;
	email_to: string;
	subject: string | null;
	body: string | null;
	step: number;
	status: string;
	scheduled_for: string | null;
	sent_at: string | null;
	created_at: string;
}

export interface Database {
	public: {
		Tables: {
			organizations: {
				Row: OrganizationRow;
				Insert: {
					id?: string;
					user_id: string;
					name?: string | null;
					metadata?: Json | null;
					stripe_account_id?: string | null;
					stripe_access_token?: string | null;
					stripe_refresh_token?: string | null;
					stripe_webhook_secret?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					name?: string | null;
					metadata?: Json | null;
					stripe_account_id?: string | null;
					stripe_access_token?: string | null;
					stripe_refresh_token?: string | null;
					stripe_webhook_secret?: string | null;
					created_at?: string;
				};
				Relationships: [];
			};
			churn_signals: {
				Row: ChurnSignalRow;
				Insert: {
					id?: string;
					org_id: string;
					stripe_customer_id: string;
					customer_email?: string | null;
					customer_name?: string | null;
					signal_type: string;
					mrr_amount?: number;
					stripe_event_id?: string | null;
					status?: string;
					ai_churn_reason?: string | null;
					ai_win_back_angle?: string | null;
					metadata?: Json | null;
					detected_at?: string;
					resolved_at?: string | null;
				};
				Update: {
					id?: string;
					org_id?: string;
					stripe_customer_id?: string;
					customer_email?: string | null;
					customer_name?: string | null;
					signal_type?: string;
					mrr_amount?: number;
					stripe_event_id?: string | null;
					status?: string;
					ai_churn_reason?: string | null;
					ai_win_back_angle?: string | null;
					metadata?: Json | null;
					detected_at?: string;
					resolved_at?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: 'churn_signals_org_id_fkey';
						columns: ['org_id'];
						isOneToOne: false;
						referencedRelation: 'organizations';
						referencedColumns: ['id'];
					}
				];
			};
			sequence_emails: {
				Row: SequenceEmailRow;
				Insert: {
					id?: string;
					signal_id: string;
					org_id: string;
					email_to: string;
					subject?: string | null;
					body?: string | null;
					step?: number;
					status?: string;
					scheduled_for?: string | null;
					sent_at?: string | null;
					created_at?: string;
				};
				Update: {
					id?: string;
					signal_id?: string;
					org_id?: string;
					email_to?: string;
					subject?: string | null;
					body?: string | null;
					step?: number;
					status?: string;
					scheduled_for?: string | null;
					sent_at?: string | null;
					created_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'sequence_emails_org_id_fkey';
						columns: ['org_id'];
						isOneToOne: false;
						referencedRelation: 'organizations';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'sequence_emails_signal_id_fkey';
						columns: ['signal_id'];
						isOneToOne: false;
						referencedRelation: 'churn_signals';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Views: Record<never, never>;
		Functions: {
			rls_auto_enable: {
				Args: Record<PropertyKey, never>;
				Returns: unknown;
			};
		};
		Enums: Record<never, never>;
		CompositeTypes: Record<never, never>;
	};
}
