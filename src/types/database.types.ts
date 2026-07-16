export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      announcements: {
        Row: {
          archived_at: string | null
          category: string
          communication_id: string | null
          content: string
          created_at: string
          created_by: string
          fund_id: string
          id: string
          is_published: boolean
          preview: string | null
          priority: string
          published_at: string | null
          scheduled_at: string | null
          send_email: boolean
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          category?: string
          communication_id?: string | null
          content: string
          created_at?: string
          created_by: string
          fund_id: string
          id?: string
          is_published?: boolean
          preview?: string | null
          priority?: string
          published_at?: string | null
          scheduled_at?: string | null
          send_email?: boolean
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          category?: string
          communication_id?: string | null
          content?: string
          created_at?: string
          created_by?: string
          fund_id?: string
          id?: string
          is_published?: boolean
          preview?: string | null
          priority?: string
          published_at?: string | null
          scheduled_at?: string | null
          send_email?: boolean
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_campaigns: {
        Row: {
          audience_filter: Json
          category: Database["public"]["Enums"]["communication_category"]
          completed_at: string | null
          created_at: string
          created_by: string | null
          delivery_stats: Json
          id: string
          metadata: Json | null
          name: string
          name_display: string | null
          preview_sent_at: string | null
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["communication_status"]
          subject_override: string | null
          template_id: string | null
          template_slug: string | null
          updated_at: string
        }
        Insert: {
          audience_filter?: Json
          category?: Database["public"]["Enums"]["communication_category"]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivery_stats?: Json
          id?: string
          metadata?: Json | null
          name: string
          name_display?: string | null
          preview_sent_at?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          subject_override?: string | null
          template_id?: string | null
          template_slug?: string | null
          updated_at?: string
        }
        Update: {
          audience_filter?: Json
          category?: Database["public"]["Enums"]["communication_category"]
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          delivery_stats?: Json
          id?: string
          metadata?: Json | null
          name?: string
          name_display?: string | null
          preview_sent_at?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          subject_override?: string | null
          template_id?: string | null
          template_slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      communication_deliveries: {
        Row: {
          channel: Database["public"]["Enums"]["communication_channel"]
          clicked_at: string | null
          communication_id: string
          created_at: string
          delivered_at: string | null
          error_message: string | null
          external_id: string | null
          id: string
          max_retries: number
          next_retry_at: string | null
          notification_id: string | null
          opened_at: string | null
          queued_at: string
          recipient_address: string | null
          retry_count: number
          sent_at: string | null
          status: Database["public"]["Enums"]["communication_status"]
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["communication_channel"]
          clicked_at?: string | null
          communication_id: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          max_retries?: number
          next_retry_at?: string | null
          notification_id?: string | null
          opened_at?: string | null
          queued_at?: string
          recipient_address?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["communication_channel"]
          clicked_at?: string | null
          communication_id?: string
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          external_id?: string | null
          id?: string
          max_retries?: number
          next_retry_at?: string | null
          notification_id?: string | null
          opened_at?: string | null
          queued_at?: string
          recipient_address?: string | null
          retry_count?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          updated_at?: string
        }
        Relationships: []
      }
      communication_preferences: {
        Row: {
          category: Database["public"]["Enums"]["communication_category"]
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at: string
          enabled: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["communication_category"]
          channel: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["communication_category"]
          channel?: Database["public"]["Enums"]["communication_channel"]
          created_at?: string
          enabled?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      communication_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      communication_templates: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          body_template: string
          category: Database["public"]["Enums"]["communication_category"]
          created_at: string
          default_channels: Database["public"]["Enums"]["communication_channel"][] | null
          description: string | null
          email_spec: Json | null
          id: string
          in_app_body_template: string | null
          in_app_title_template: string | null
          is_active: boolean
          is_archived: boolean
          last_edited_by: string | null
          name: string
          slug: string
          subject_template: string | null
          updated_at: string
          variables_schema: Json | null
          version: number
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          body_template: string
          category: Database["public"]["Enums"]["communication_category"]
          created_at?: string
          default_channels?: Database["public"]["Enums"]["communication_channel"][] | null
          description?: string | null
          email_spec?: Json | null
          id?: string
          in_app_body_template?: string | null
          in_app_title_template?: string | null
          is_active?: boolean
          is_archived?: boolean
          last_edited_by?: string | null
          name: string
          slug: string
          subject_template?: string | null
          updated_at?: string
          variables_schema?: Json | null
          version?: number
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          body_template?: string
          category?: Database["public"]["Enums"]["communication_category"]
          created_at?: string
          default_channels?: Database["public"]["Enums"]["communication_channel"][] | null
          description?: string | null
          email_spec?: Json | null
          id?: string
          in_app_body_template?: string | null
          in_app_title_template?: string | null
          is_active?: boolean
          is_archived?: boolean
          last_edited_by?: string | null
          name?: string
          slug?: string
          subject_template?: string | null
          updated_at?: string
          variables_schema?: Json | null
          version?: number
        }
        Relationships: []
      }
      communication_template_test_sends: {
        Row: {
          created_at: string
          id: string
          recipient_email: string
          rendered_html: string | null
          rendered_plain_text: string | null
          rendered_subject: string | null
          sent_by: string | null
          status: Database["public"]["Enums"]["communication_status"]
          template_id: string | null
          template_slug: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          recipient_email: string
          rendered_html?: string | null
          rendered_plain_text?: string | null
          rendered_subject?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          template_id?: string | null
          template_slug: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          recipient_email?: string
          rendered_html?: string | null
          rendered_plain_text?: string | null
          rendered_subject?: string | null
          sent_by?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          template_id?: string | null
          template_slug?: string
          variables?: Json | null
        }
        Relationships: []
      }
      communication_template_versions: {
        Row: {
          body_template: string
          category: Database["public"]["Enums"]["communication_category"]
          change_notes: string | null
          created_at: string
          default_channels: Database["public"]["Enums"]["communication_channel"][] | null
          description: string | null
          edited_by: string | null
          email_spec: Json | null
          id: string
          in_app_body_template: string | null
          in_app_title_template: string | null
          name: string
          slug: string
          subject_template: string | null
          template_id: string
          variables_schema: Json | null
          version_number: number
        }
        Insert: {
          body_template: string
          category: Database["public"]["Enums"]["communication_category"]
          change_notes?: string | null
          created_at?: string
          default_channels?: Database["public"]["Enums"]["communication_channel"][] | null
          description?: string | null
          edited_by?: string | null
          email_spec?: Json | null
          id?: string
          in_app_body_template?: string | null
          in_app_title_template?: string | null
          name: string
          slug: string
          subject_template?: string | null
          template_id: string
          variables_schema?: Json | null
          version_number: number
        }
        Update: {
          body_template?: string
          category?: Database["public"]["Enums"]["communication_category"]
          change_notes?: string | null
          created_at?: string
          default_channels?: Database["public"]["Enums"]["communication_channel"][] | null
          description?: string | null
          edited_by?: string | null
          email_spec?: Json | null
          id?: string
          in_app_body_template?: string | null
          in_app_title_template?: string | null
          name?: string
          slug?: string
          subject_template?: string | null
          template_id?: string
          variables_schema?: Json | null
          version_number?: number
        }
        Relationships: []
      }
      communications: {
        Row: {
          category: Database["public"]["Enums"]["communication_category"]
          created_at: string
          error_summary: string | null
          id: string
          metadata: Json | null
          priority: Database["public"]["Enums"]["communication_priority"]
          recipient_user_id: string
          related_entity_id: string | null
          related_entity_type: string | null
          rendered_body: string | null
          rendered_in_app_body: string | null
          rendered_in_app_title: string | null
          rendered_subject: string | null
          status: Database["public"]["Enums"]["communication_status"]
          template_id: string | null
          template_slug: string | null
          triggered_by: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          category: Database["public"]["Enums"]["communication_category"]
          created_at?: string
          error_summary?: string | null
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["communication_priority"]
          recipient_user_id: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          rendered_body?: string | null
          rendered_in_app_body?: string | null
          rendered_in_app_title?: string | null
          rendered_subject?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          template_id?: string | null
          template_slug?: string | null
          triggered_by?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          category?: Database["public"]["Enums"]["communication_category"]
          created_at?: string
          error_summary?: string | null
          id?: string
          metadata?: Json | null
          priority?: Database["public"]["Enums"]["communication_priority"]
          recipient_user_id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          rendered_body?: string | null
          rendered_in_app_body?: string | null
          rendered_in_app_title?: string | null
          rendered_subject?: string | null
          status?: Database["public"]["Enums"]["communication_status"]
          template_id?: string | null
          template_slug?: string | null
          triggered_by?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      crypto_deposit_wallets: {
        Row: {
          created_at: string
          fund_id: string
          icon_color: string
          id: string
          is_active: boolean
          min_deposit: number
          name: string
          network_code: string
          network_label: string
          sort_order: number
          symbol: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          fund_id: string
          icon_color?: string
          id?: string
          is_active?: boolean
          min_deposit?: number
          name: string
          network_code: string
          network_label: string
          sort_order?: number
          symbol: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          fund_id?: string
          icon_color?: string
          id?: string
          is_active?: boolean
          min_deposit?: number
          name?: string
          network_code?: string
          network_label?: string
          sort_order?: number
          symbol?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "crypto_deposit_wallets_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_fund_snapshots: {
        Row: {
          active_investors: number
          assets_under_management: number
          closing_pool_value: number
          created_at: string
          daily_profit_loss: number
          daily_roi: number
          deposits_received: number
          fund_id: string
          id: string
          is_locked: boolean
          locked_at: string | null
          locked_by: string | null
          losing_trades: number
          manager_notes: string | null
          opening_pool_value: number
          snapshot_date: string
          trades_count: number
          win_rate: number
          winning_trades: number
          withdrawals_processed: number
        }
        Insert: {
          active_investors?: number
          assets_under_management?: number
          closing_pool_value: number
          created_at?: string
          daily_profit_loss?: number
          daily_roi?: number
          deposits_received?: number
          fund_id: string
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          losing_trades?: number
          manager_notes?: string | null
          opening_pool_value: number
          snapshot_date: string
          trades_count?: number
          win_rate?: number
          winning_trades?: number
          withdrawals_processed?: number
        }
        Update: {
          active_investors?: number
          assets_under_management?: number
          closing_pool_value?: number
          created_at?: string
          daily_profit_loss?: number
          daily_roi?: number
          deposits_received?: number
          fund_id?: string
          id?: string
          is_locked?: boolean
          locked_at?: string | null
          locked_by?: string | null
          losing_trades?: number
          manager_notes?: string | null
          opening_pool_value?: number
          snapshot_date?: string
          trades_count?: number
          win_rate?: number
          winning_trades?: number
          withdrawals_processed?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_fund_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_fund_snapshots_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_items: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_published: boolean
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_published?: boolean
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_published?: boolean
          question?: string
          sort_order?: number
        }
        Relationships: []
      }
      funds: {
        Row: {
          active_investors: number
          admin_comments: string | null
          admin_ranking: number
          aggressiveness_level: string | null
          approved_at: string | null
          assets_under_management: number
          capacity_status: string
          card_background_color: string | null
          categories: string[]
          cover_image_url: string | null
          created_at: string
          current_capital: number
          current_roi: number
          description: string | null
          featured: boolean
          id: string
          is_default: boolean
          is_invite_only: boolean
          is_marketplace_listed: boolean
          lifecycle_status: string
          listed_at: string | null
          logo_url: string | null
          markets_traded: string[]
          max_aum: number | null
          max_investment: number | null
          max_investors_cap: number | null
          min_investment: number
          name: string
          pool_description: string | null
          pool_duration_days: number | null
          pool_faq: Json
          pool_health: string
          pool_manager_icon_url: string | null
          pool_manager_id: string | null
          pool_manager_name: string | null
          pool_value: number
          profit_target_pct: number | null
          return_tiers: Json
          risk_summary: string | null
          ryvonx_rating: number | null
          security_rating: string | null
          slug: string
          sort_order: number
          status: string
          submitted_at: string | null
          suggested_investment: number | null
          tagline: string | null
          target_capital: number | null
          target_investors: number | null
          trading_pair: string | null
          updated_at: string
          governance_stage: string
          governance_verified: boolean
          governance_approved: boolean
          under_governance_review: boolean
          on_probation: boolean
          probation_started_at: string | null
          probation_ends_at: string | null
          probation_notes: string | null
          pause_new_investments: boolean
          pause_withdrawals: boolean
          freeze_marketing: boolean
          hide_from_marketplace: boolean
          require_additional_review: boolean
          trading_suspended: boolean
          suspension_reason: string | null
          suspension_notes: string | null
          suspended_at: string | null
          suspended_by: string | null
          next_review_at: string | null
          review_frequency: string | null
          investor_capital: number
          ryvonx_capital: number
          is_ryvonx_backed: boolean
          ryvonx_backed_at: string | null
          ryvonx_backed_by: string | null
          allocation_status: string
          allocation_review_at: string | null
          growth_rate_pct: number | null
        }
        Insert: {
          active_investors?: number
          assets_under_management?: number
          approved_at?: string | null
          card_background_color?: string | null
          cover_image_url?: string | null
          created_at?: string
          current_capital?: number
          current_roi?: number
          description?: string | null
          id?: string
          is_default?: boolean
          is_invite_only?: boolean
          lifecycle_status?: string
          max_investment?: number | null
          min_investment?: number
          name: string
          pool_description?: string | null
          pool_duration_days?: number | null
          pool_manager_icon_url?: string | null
          pool_manager_id?: string | null
          pool_manager_name?: string | null
          pool_value?: number
          profit_target_pct?: number | null
          return_tiers?: Json
          slug: string
          status?: string
          submitted_at?: string | null
          target_capital?: number | null
          target_investors?: number | null
          trading_pair?: string | null
          updated_at?: string
        }
        Update: {
          active_investors?: number
          assets_under_management?: number
          approved_at?: string | null
          card_background_color?: string | null
          cover_image_url?: string | null
          created_at?: string
          current_capital?: number
          current_roi?: number
          description?: string | null
          id?: string
          is_default?: boolean
          is_invite_only?: boolean
          lifecycle_status?: string
          max_investment?: number | null
          min_investment?: number
          name?: string
          pool_description?: string | null
          pool_duration_days?: number | null
          pool_manager_icon_url?: string | null
          pool_manager_id?: string | null
          pool_manager_name?: string | null
          pool_value?: number
          profit_target_pct?: number | null
          return_tiers?: Json
          slug?: string
          status?: string
          target_capital?: number | null
          target_investors?: number | null
          trading_pair?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "funds_pool_manager_id_fkey"
            columns: ["pool_manager_id"]
            isOneToOne: false
            referencedRelation: "pool_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_managers: {
        Row: {
          aggressiveness_rating: number | null
          application_id: string | null
          approved_at: string | null
          approved_by: string | null
          avg_monthly_return_pct: number | null
          bio: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string
          display_name: string
          icon_url: string | null
          id: string
          is_platform_managed: boolean
          is_verified: boolean
          markets: string[] | null
          max_drawdown_pct: number | null
          profile_photo_url: string | null
          ryvonx_rating: number | null
          security_rating: number | null
          slug: string | null
          status: string
          trading_since: string | null
          trading_style: string | null
          updated_at: string
          user_id: string | null
          win_rate_pct: number | null
          governance_stage: string
          manager_level: string
          level_promoted_at: string | null
          level_promoted_by: string | null
          next_level_review_at: string | null
          development_notes: string | null
        }
        Insert: {
          aggressiveness_rating?: number | null
          application_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avg_monthly_return_pct?: number | null
          bio?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          display_name: string
          icon_url?: string | null
          id?: string
          is_platform_managed?: boolean
          is_verified?: boolean
          markets?: string[] | null
          max_drawdown_pct?: number | null
          profile_photo_url?: string | null
          ryvonx_rating?: number | null
          security_rating?: number | null
          slug?: string | null
          status?: string
          trading_since?: string | null
          trading_style?: string | null
          updated_at?: string
          user_id?: string | null
          win_rate_pct?: number | null
        }
        Update: {
          aggressiveness_rating?: number | null
          application_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          avg_monthly_return_pct?: number | null
          bio?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string
          display_name?: string
          icon_url?: string | null
          id?: string
          is_platform_managed?: boolean
          is_verified?: boolean
          markets?: string[] | null
          max_drawdown_pct?: number | null
          profile_photo_url?: string | null
          ryvonx_rating?: number | null
          security_rating?: number | null
          slug?: string | null
          status?: string
          trading_since?: string | null
          trading_style?: string | null
          updated_at?: string
          user_id?: string | null
          win_rate_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pool_managers_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_managers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_manager_applications: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          basic_info: Json
          challenge_enrollment_id: string | null
          created_at: string
          current_stage: number
          id: string
          pool_manager_id: string | null
          rejected_at: string | null
          reviewed_at: string | null
          status: Database["public"]["Enums"]["pool_manager_application_status"]
          strategy_data: Json
          strategy_submitted_at: string | null
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          basic_info?: Json
          challenge_enrollment_id?: string | null
          created_at?: string
          current_stage?: number
          id?: string
          pool_manager_id?: string | null
          rejected_at?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["pool_manager_application_status"]
          strategy_data?: Json
          strategy_submitted_at?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          basic_info?: Json
          challenge_enrollment_id?: string | null
          created_at?: string
          current_stage?: number
          id?: string
          pool_manager_id?: string | null
          rejected_at?: string | null
          reviewed_at?: string | null
          status?: Database["public"]["Enums"]["pool_manager_application_status"]
          strategy_data?: Json
          strategy_submitted_at?: string | null
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_manager_applications_challenge_enrollment_id_fkey"
            columns: ["challenge_enrollment_id"]
            isOneToOne: false
            referencedRelation: "trader_challenge_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_manager_applications_pool_manager_id_fkey"
            columns: ["pool_manager_id"]
            isOneToOne: false
            referencedRelation: "pool_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_manager_applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_manager_application_reviews: {
        Row: {
          application_id: string
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["pool_manager_application_status"]
          notes: string | null
          previous_status: Database["public"]["Enums"]["pool_manager_application_status"] | null
          reviewer_id: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["pool_manager_application_status"]
          notes?: string | null
          previous_status?: Database["public"]["Enums"]["pool_manager_application_status"] | null
          reviewer_id: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["pool_manager_application_status"]
          notes?: string | null
          previous_status?: Database["public"]["Enums"]["pool_manager_application_status"] | null
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_manager_application_reviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "pool_manager_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_manager_application_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_governance_rules: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      pool_governance_violations: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      pool_governance_warnings: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      pool_governance_reviews: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      pool_governance_scores: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      pool_governance_timeline: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      ryvonx_capital_settings: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      pool_capital_allocations: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      pool_manager_achievement_definitions: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      pool_manager_achievements: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      pool_manager_career_events: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      pool_manager_content: {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
      investor_portfolios: {
        Row: {
          available_balance: number
          current_value: number
          fund_id: string
          investment_duration_days: number | null
          investment_maturity_date: string | null
          investment_start_date: string | null
          last_deposit_at: string | null
          ownership_percentage: number
          realized_pnl: number
          total_deposits: number
          total_invested: number
          total_withdrawals: number
          unrealized_pnl: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          current_value?: number
          fund_id: string
          investment_duration_days?: number | null
          investment_maturity_date?: string | null
          investment_start_date?: string | null
          last_deposit_at?: string | null
          ownership_percentage?: number
          realized_pnl?: number
          total_deposits?: number
          total_invested?: number
          total_withdrawals?: number
          unrealized_pnl?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          current_value?: number
          fund_id?: string
          investment_duration_days?: number | null
          investment_maturity_date?: string | null
          investment_start_date?: string | null
          last_deposit_at?: string | null
          ownership_percentage?: number
          realized_pnl?: number
          total_deposits?: number
          total_invested?: number
          total_withdrawals?: number
          unrealized_pnl?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_portfolios_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_portfolios_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          fund_id: string
          id: string
          is_public: boolean
          published_at: string
          sentiment: Database["public"]["Enums"]["journal_sentiment"]
          title: string
          trade_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          fund_id: string
          id?: string
          is_public?: boolean
          published_at?: string
          sentiment?: Database["public"]["Enums"]["journal_sentiment"]
          title: string
          trade_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          fund_id?: string
          id?: string
          is_public?: boolean
          published_at?: string
          sentiment?: Database["public"]["Enums"]["journal_sentiment"]
          title?: string
          trade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_snapshots: {
        Row: {
          created_at: string
          cumulative_roi: number
          daily_roi: number
          date: string
          fund_id: string
          id: string
          pool_value: number
        }
        Insert: {
          created_at?: string
          cumulative_roi?: number
          daily_roi?: number
          date: string
          fund_id: string
          id?: string
          pool_value: number
        }
        Update: {
          created_at?: string
          cumulative_roi?: number
          daily_roi?: number
          date?: string
          fund_id?: string
          id?: string
          pool_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_snapshots_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_invitations: {
        Row: {
          created_at: string
          fund_id: string
          id: string
          invited_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fund_id: string
          id?: string
          invited_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          fund_id?: string
          id?: string
          invited_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_invitations_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_invitations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_stats: {
        Row: {
          daily_roi: number
          fund_id: string
          id: string
          monthly_roi: number
          total_active_investors: number
          total_closed_trades: number
          total_deposits: number
          total_pool_value: number
          total_withdrawals: number
          updated_at: string
          weekly_roi: number
          win_rate: number
        }
        Insert: {
          daily_roi?: number
          fund_id: string
          id?: string
          monthly_roi?: number
          total_active_investors?: number
          total_closed_trades?: number
          total_deposits?: number
          total_pool_value?: number
          total_withdrawals?: number
          updated_at?: string
          weekly_roi?: number
          win_rate?: number
        }
        Update: {
          daily_roi?: number
          fund_id?: string
          id?: string
          monthly_roi?: number
          total_active_investors?: number
          total_closed_trades?: number
          total_deposits?: number
          total_pool_value?: number
          total_withdrawals?: number
          updated_at?: string
          weekly_roi?: number
          win_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "pool_stats_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: true
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          show_activity_publicly: boolean
          updated_at: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          show_activity_publicly?: boolean
          updated_at?: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          show_activity_publicly?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_admin: boolean
          sender_id: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_admin?: boolean
          sender_id: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string
          id: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      testimonials: {
        Row: {
          content: string
          created_at: string
          id: string
          is_published: boolean
          name: string
          rating: number
          return_rate: number | null
          role: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_published?: boolean
          name: string
          rating?: number
          return_rate?: number | null
          role: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          name?: string
          rating?: number
          return_rate?: number | null
          role?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      trader_challenge_enrollments: {
        Row: {
          admin_rules: string | null
          amount_paid: number | null
          challenge_account_details: string | null
          challenge_id: string
          created_at: string
          id: string
          payment_method: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_rules?: string | null
          amount_paid?: number | null
          challenge_account_details?: string | null
          challenge_id: string
          created_at?: string
          id?: string
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_rules?: string | null
          amount_paid?: number | null
          challenge_account_details?: string | null
          challenge_id?: string
          created_at?: string
          id?: string
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trader_challenge_enrollments_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "trader_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trader_challenge_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trader_challenges: {
        Row: {
          button_text: string
          created_at: string
          description: string
          duration_days: number
          fund_id: string | null
          id: string
          is_active: boolean
          max_daily_loss_pct: number | null
          max_overall_loss_pct: number
          max_risk_per_trade_pct: number | null
          min_trading_days: number
          price: number
          profit_target_pct: number
          purpose: string
          rules_summary: string | null
          title: string
          trading_rules: string | null
          updated_at: string
        }
        Insert: {
          button_text?: string
          created_at?: string
          description?: string
          duration_days?: number
          fund_id?: string | null
          id?: string
          is_active?: boolean
          max_daily_loss_pct?: number | null
          max_overall_loss_pct?: number
          max_risk_per_trade_pct?: number | null
          min_trading_days?: number
          price?: number
          profit_target_pct?: number
          purpose?: string
          rules_summary?: string | null
          title?: string
          trading_rules?: string | null
          updated_at?: string
        }
        Update: {
          button_text?: string
          created_at?: string
          description?: string
          duration_days?: number
          fund_id?: string | null
          id?: string
          is_active?: boolean
          max_daily_loss_pct?: number | null
          max_overall_loss_pct?: number
          max_risk_per_trade_pct?: number | null
          min_trading_days?: number
          price?: number
          profit_target_pct?: number
          purpose?: string
          rules_summary?: string | null
          title?: string
          trading_rules?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trader_challenges_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          chart_screenshot_url: string | null
          closed_at: string | null
          created_at: string
          created_by: string | null
          current_price: number | null
          direction: Database["public"]["Enums"]["trade_direction"]
          entry_price: number
          exit_price: number | null
          fund_id: string
          id: string
          invested_amount: number | null
          investor_status: string | null
          notes: string | null
          opened_at: string
          pnl: number | null
          pnl_percentage: number | null
          published_at: string | null
          quantity: number
          status: Database["public"]["Enums"]["trade_status"]
          symbol: string
          updated_at: string
        }
        Insert: {
          chart_screenshot_url?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_price?: number | null
          direction: Database["public"]["Enums"]["trade_direction"]
          entry_price: number
          exit_price?: number | null
          fund_id: string
          id?: string
          invested_amount?: number | null
          investor_status?: string | null
          notes?: string | null
          opened_at?: string
          pnl?: number | null
          pnl_percentage?: number | null
          published_at?: string | null
          quantity: number
          status?: Database["public"]["Enums"]["trade_status"]
          symbol: string
          updated_at?: string
        }
        Update: {
          chart_screenshot_url?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          current_price?: number | null
          direction?: Database["public"]["Enums"]["trade_direction"]
          entry_price?: number
          exit_price?: number | null
          fund_id?: string
          id?: string
          invested_amount?: number | null
          investor_status?: string | null
          notes?: string | null
          opened_at?: string
          pnl?: number | null
          pnl_percentage?: number | null
          published_at?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["trade_status"]
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trades_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trades_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_by: string | null
          created_at: string
          crypto_amount: number | null
          crypto_network: string | null
          crypto_symbol: string | null
          destination: string | null
          fund_id: string
          id: string
          is_public: boolean
          notes: string | null
          payment_method: string | null
          payment_proof: string | null
          processed_at: string | null
          processed_by: string | null
          reference: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          approved_by?: string | null
          created_at?: string
          crypto_amount?: number | null
          crypto_network?: string | null
          crypto_symbol?: string | null
          destination?: string | null
          fund_id: string
          id?: string
          is_public?: boolean
          notes?: string | null
          payment_method?: string | null
          payment_proof?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_by?: string | null
          created_at?: string
          crypto_amount?: number | null
          crypto_network?: string | null
          crypto_symbol?: string | null
          destination?: string | null
          fund_id?: string
          id?: string
          is_public?: boolean
          notes?: string | null
          payment_method?: string | null
          payment_proof?: string | null
          processed_at?: string | null
          processed_by?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      communication_category:
        | "system"
        | "investment"
        | "pool_manager"
        | "marketplace"
        | "governance"
        | "capital_allocation"
        | "support"
        | "announcements"
        | "marketing"
        | "security"
        | "reports"
      communication_channel:
        | "email"
        | "in_app"
        | "sms"
        | "push"
        | "whatsapp"
        | "slack"
        | "webhook"
      communication_priority: "low" | "normal" | "high" | "critical"
      communication_status:
        | "draft"
        | "queued"
        | "sending"
        | "sent"
        | "delivered"
        | "failed"
        | "archived"
      journal_sentiment: "bullish" | "bearish" | "neutral"
      notification_type:
        | "deposit_approved"
        | "deposit_rejected"
        | "withdrawal_approved"
        | "withdrawal_rejected"
        | "announcement"
        | "performance_update"
        | "system"
        | "pool_invitation"
        | "pool_trading"
        | "support_reply"
        | "admin_message"
        | "pm_application_submitted"
        | "pm_challenge_started"
        | "pm_challenge_passed"
        | "pm_challenge_failed"
        | "pm_strategy_changes"
        | "pm_interview_scheduled"
        | "pm_application_approved"
        | "pm_application_rejected"
        | "pm_pool_approved"
        | "pm_pool_suspended"
        | "pm_pool_closed"
        | "pool_governance_warning"
        | "pool_governance_violation"
        | "pool_governance_probation"
        | "pool_governance_restricted"
        | "pool_governance_suspended"
        | "pool_governance_reactivated"
        | "pool_governance_review"
        | "pool_investment_restricted"
        | "capital_review_scheduled"
        | "capital_allocation_approved"
        | "capital_allocation_increased"
        | "capital_allocation_reduced"
        | "capital_allocation_removed"
        | "manager_promotion_achieved"
        | "manager_achievement_awarded"
        | "committee_review_completed"
        | "content_approved"
        | "content_rejected"
      pool_manager_application_status:
        | "draft"
        | "pending"
        | "under_review"
        | "requires_changes"
        | "interview_required"
        | "approved"
        | "rejected"
      trade_direction: "long" | "short"
      trade_status: "open" | "closed" | "cancelled"
      transaction_status:
        | "pending"
        | "approved"
        | "rejected"
        | "completed"
        | "cancelled"
      transaction_type: "deposit" | "withdrawal" | "adjustment"
      user_role:
        | "visitor"
        | "investor"
        | "pool_manager_applicant"
        | "pool_manager"
        | "administrator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
