export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Provider = "stripe" | "paddle" | "lemonsqueezy" | "polar";

export interface ProviderConnection {
  type: Provider;
  account_id: string;
  access_token: string;
  refresh_token?: string;
  webhook_secret: string;
  connected_at: string;
  status: "active" | "error";
  error_message?: string;
  label?: string;
}

export interface OrganizationRow {
  id: string;
  user_id: string;
  name: string | null;
  metadata: Json | null;
  providers: Json | null;
  polar_account_id: string | null;
  polar_access_token: string | null;
  polar_refresh_token: string | null;
  polar_webhook_secret: string | null;
  polar_organization_id?: string | null;
  created_at: string;
}

export interface ChurnSignalRow {
  id: string;
  org_id: string;
  provider: string;
  polar_customer_id: string;
  customer_email: string | null;
  customer_name: string | null;
  signal_type: string;
  mrr_amount: number;
  polar_event_id: string | null;
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

export interface ProviderEventRow {
  id: string;
  org_id: string;
  provider: Provider;
  event_id: string;
  event_type: string;
  payload: Json;
  processed: boolean;
  error_message: string | null;
  created_at: string;
}

export interface AnalyticsEventRow {
  id: string;
  event_name: string;
  properties: Json;
  session_id: string | null;
  created_at: string;
}

export interface RateLimitEventRow {
  id: string;
  key: string;
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
          providers?: Json | null;
          polar_account_id?: string | null;
          polar_access_token?: string | null;
          polar_refresh_token?: string | null;
          polar_webhook_secret?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string | null;
          metadata?: Json | null;
          providers?: Json | null;
          polar_account_id?: string | null;
          polar_access_token?: string | null;
          polar_refresh_token?: string | null;
          polar_webhook_secret?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      churn_signals: {
        Row: ChurnSignalRow;
        Insert: {
          id?: string;
          org_id: string;
          provider?: string;
          polar_customer_id: string;
          customer_email?: string | null;
          customer_name?: string | null;
          signal_type: string;
          mrr_amount?: number;
          polar_event_id?: string | null;
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
          provider?: string;
          polar_customer_id?: string;
          customer_email?: string | null;
          customer_name?: string | null;
          signal_type?: string;
          mrr_amount?: number;
          polar_event_id?: string | null;
          status?: string;
          ai_churn_reason?: string | null;
          ai_win_back_angle?: string | null;
          metadata?: Json | null;
          detected_at?: string;
          resolved_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "churn_signals_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
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
            foreignKeyName: "sequence_emails_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sequence_emails_signal_id_fkey";
            columns: ["signal_id"];
            isOneToOne: false;
            referencedRelation: "churn_signals";
            referencedColumns: ["id"];
          },
        ];
      };
      provider_events: {
        Row: ProviderEventRow;
        Insert: {
          id?: string;
          org_id: string;
          provider: Provider;
          event_id: string;
          event_type: string;
          payload: Json;
          processed?: boolean;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          processed?: boolean;
          error_message?: string | null;
        };
        Relationships: [];
      };
      analytics_events: {
        Row: AnalyticsEventRow;
        Insert: {
          id?: string;
          event_name: string;
          properties?: Json;
          session_id?: string | null;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      rate_limit_events: {
        Row: RateLimitEventRow;
        Insert: {
          id?: string;
          key: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
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
