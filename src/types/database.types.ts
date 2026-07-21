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
      challenge_trades: {
        Row: {
          created_at: string
          direction: string
          enrollment_id: string
          entry_price: number
          exit_price: number
          id: string
          instrument: string
          lot_size: number
          market: string | null
          notes: string | null
          profit_loss: number
          rejection_reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewer_id: string | null
          screenshot_url: string | null
          source: string
          status: string
          trade_date: string
          trading_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          enrollment_id: string
          entry_price: number
          exit_price: number
          id?: string
          instrument: string
          lot_size: number
          market?: string | null
          notes?: string | null
          profit_loss: number
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          screenshot_url?: string | null
          source?: string
          status?: string
          trade_date: string
          trading_day?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          enrollment_id?: string
          entry_price?: number
          exit_price?: number
          id?: string
          instrument?: string
          lot_size?: number
          market?: string | null
          notes?: string | null
          profit_loss?: number
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewer_id?: string | null
          screenshot_url?: string | null
          source?: string
          status?: string
          trade_date?: string
          trading_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_trades_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "trader_challenge_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_trades_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_trades_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_templates: {
        Row: {
          automatic_failure_conditions: Json
          created_at: string
          currency: string
          default_broker: string
          description: string | null
          evaluation_criteria: Json
          id: string
          is_default: boolean
          max_daily_drawdown_pct: number
          max_evaluation_days: number
          max_overall_drawdown_pct: number
          max_risk_per_trade_pct: number
          max_simultaneous_positions: number
          max_total_exposure_pct: number
          min_closed_trades: number
          min_trading_days: number
          name: string
          platform: string
          profit_target_pct: number
          slug: string
          starting_balance: number
          status: string
          trade_requirements: Json
          trading_journal: Json
          trading_rules: Json
          updated_at: string
        }
        Insert: {
          automatic_failure_conditions?: Json
          created_at?: string
          currency?: string
          default_broker: string
          description?: string | null
          evaluation_criteria?: Json
          id?: string
          is_default?: boolean
          max_daily_drawdown_pct: number
          max_evaluation_days: number
          max_overall_drawdown_pct: number
          max_risk_per_trade_pct: number
          max_simultaneous_positions: number
          max_total_exposure_pct: number
          min_closed_trades: number
          min_trading_days: number
          name: string
          platform: string
          profit_target_pct: number
          slug: string
          starting_balance: number
          status?: string
          trade_requirements?: Json
          trading_journal?: Json
          trading_rules?: Json
          updated_at?: string
        }
        Update: {
          automatic_failure_conditions?: Json
          created_at?: string
          currency?: string
          default_broker?: string
          description?: string | null
          evaluation_criteria?: Json
          id?: string
          is_default?: boolean
          max_daily_drawdown_pct?: number
          max_evaluation_days?: number
          max_overall_drawdown_pct?: number
          max_risk_per_trade_pct?: number
          max_simultaneous_positions?: number
          max_total_exposure_pct?: number
          min_closed_trades?: number
          min_trading_days?: number
          name?: string
          platform?: string
          profit_target_pct?: number
          slug?: string
          starting_balance?: number
          status?: string
          trade_requirements?: Json
          trading_journal?: Json
          trading_rules?: Json
          updated_at?: string
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
          display_active_investors: number
          admin_comments: string | null
          admin_ranking: number
          aggressiveness_level: string | null
          approved_at: string | null
          assets_under_management: number
          capacity_status: string
          card_background_color: string | null
          categories: string[]
          cover_image_url: string | null
          cover_image_position: Json
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
          pool_config_version: number
          pending_revision: Json | null
          revision_status: string
          investor_share_pct: number
          pool_manager_share_pct: number
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
          display_active_investors?: number
          assets_under_management?: number
          approved_at?: string | null
          card_background_color?: string | null
          cover_image_url?: string | null
          cover_image_position?: Json
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
          pool_config_version?: number
          pending_revision?: Json | null
          revision_status?: string
          investor_share_pct?: number
          pool_manager_share_pct?: number
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
          display_active_investors?: number
          assets_under_management?: number
          approved_at?: string | null
          card_background_color?: string | null
          cover_image_url?: string | null
          cover_image_position?: Json
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
          pool_config_version?: number
          pending_revision?: Json | null
          revision_status?: string
          investor_share_pct?: number
          pool_manager_share_pct?: number
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
          cover_image_position: Json
          created_at: string
          display_name: string
          display_investor_count: number
          display_review_count: number
          display_trade_count: number
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
          show_full_name: boolean
          social_links: Json | null
          username: string | null
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
          cover_image_position?: Json
          created_at?: string
          display_name: string
          display_investor_count?: number
          display_review_count?: number
          display_trade_count?: number
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
          show_full_name?: boolean
          social_links?: Json | null
          username?: string | null
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
          cover_image_position?: Json
          created_at?: string
          display_name?: string
          display_investor_count?: number
          display_review_count?: number
          display_trade_count?: number
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
          show_full_name?: boolean
          social_links?: Json | null
          username?: string | null
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
          challenge_template_id: string | null
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
          challenge_template_id?: string | null
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
          challenge_template_id?: string | null
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
      distribution_records: {
        Row: {
          amount: number
          approved_by: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          distribution_batch_id: string | null
          id: string
          investment_allocation_id: string
          investment_cycle_id: string
          investor_id: string
          ledger_transaction_id: string | null
          notes: string | null
          status: Database["public"]["Enums"]["distribution_record_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          distribution_batch_id?: string | null
          id?: string
          investment_allocation_id: string
          investment_cycle_id: string
          investor_id: string
          ledger_transaction_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["distribution_record_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          distribution_batch_id?: string | null
          id?: string
          investment_allocation_id?: string
          investment_cycle_id?: string
          investor_id?: string
          ledger_transaction_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["distribution_record_status"]
          updated_at?: string
        }
        Relationships: []
      }
      financial_adjustments: {
        Row: {
          adjustment_reference: string
          amount: number
          approved_by: string | null
          created_at: string
          created_by: string
          credit_account_id: string
          currency: string
          debit_account_id: string
          id: string
          ledger_transaction_id: string | null
          reason: string
          status: Database["public"]["Enums"]["financial_adjustment_status"]
          updated_at: string
        }
        Insert: {
          adjustment_reference: string
          amount: number
          approved_by?: string | null
          created_at?: string
          created_by: string
          credit_account_id: string
          currency?: string
          debit_account_id: string
          id?: string
          ledger_transaction_id?: string | null
          reason: string
          status?: Database["public"]["Enums"]["financial_adjustment_status"]
          updated_at?: string
        }
        Update: {
          adjustment_reference?: string
          amount?: number
          approved_by?: string | null
          created_at?: string
          created_by?: string
          credit_account_id?: string
          currency?: string
          debit_account_id?: string
          id?: string
          ledger_transaction_id?: string | null
          reason?: string
          status?: Database["public"]["Enums"]["financial_adjustment_status"]
          updated_at?: string
        }
        Relationships: []
      }
      profit_settlements: {
        Row: {
          id: string
          investment_cycle_id: string
          fund_id: string | null
          pool_manager_id: string
          cycle_capital: number
          gross_trading_profit: number
          platform_service_fee_pct: number
          platform_service_fee: number
          net_distributable_profit: number
          investor_share_pct: number
          pool_manager_share_pct: number
          investor_distribution_total: number
          pool_manager_earnings: number
          status: Database["public"]["Enums"]["profit_settlement_status"]
          settlement_date: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          distributed_at: string | null
          settlement_ledger_transaction_id: string | null
          currency: string
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          investment_cycle_id: string
          fund_id?: string | null
          pool_manager_id: string
          cycle_capital?: number
          gross_trading_profit?: number
          platform_service_fee_pct?: number
          platform_service_fee?: number
          net_distributable_profit?: number
          investor_share_pct: number
          pool_manager_share_pct: number
          investor_distribution_total?: number
          pool_manager_earnings?: number
          status?: Database["public"]["Enums"]["profit_settlement_status"]
          settlement_date?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          distributed_at?: string | null
          settlement_ledger_transaction_id?: string | null
          currency?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          investment_cycle_id?: string
          fund_id?: string | null
          pool_manager_id?: string
          cycle_capital?: number
          gross_trading_profit?: number
          platform_service_fee_pct?: number
          platform_service_fee?: number
          net_distributable_profit?: number
          investor_share_pct?: number
          pool_manager_share_pct?: number
          investor_distribution_total?: number
          pool_manager_earnings?: number
          status?: Database["public"]["Enums"]["profit_settlement_status"]
          settlement_date?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          distributed_at?: string | null
          settlement_ledger_transaction_id?: string | null
          currency?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profit_settlement_allocations: {
        Row: {
          id: string
          profit_settlement_id: string
          investment_allocation_id: string
          investor_id: string
          capital_basis: number
          ownership_pct: number
          profit_share: number
          status: string
          ledger_transaction_id: string | null
          transferred_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profit_settlement_id: string
          investment_allocation_id: string
          investor_id: string
          capital_basis: number
          ownership_pct: number
          profit_share: number
          status?: string
          ledger_transaction_id?: string | null
          transferred_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          profit_settlement_id?: string
          investment_allocation_id?: string
          investor_id?: string
          capital_basis?: number
          ownership_pct?: number
          profit_share?: number
          status?: string
          ledger_transaction_id?: string | null
          transferred_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_revenue_entries: {
        Row: {
          id: string
          profit_settlement_id: string | null
          investment_cycle_id: string
          fund_id: string | null
          pool_manager_id: string | null
          amount: number
          currency: string
          recorded_at: string
          ledger_transaction_id: string | null
        }
        Insert: {
          id?: string
          profit_settlement_id?: string | null
          investment_cycle_id: string
          fund_id?: string | null
          pool_manager_id?: string | null
          amount: number
          currency?: string
          recorded_at?: string
          ledger_transaction_id?: string | null
        }
        Update: {
          id?: string
          profit_settlement_id?: string | null
          investment_cycle_id?: string
          fund_id?: string | null
          pool_manager_id?: string | null
          amount?: number
          currency?: string
          recorded_at?: string
          ledger_transaction_id?: string | null
        }
        Relationships: []
      }
      automation_rules: {
        Row: {
          actions: Json
          category: Database["public"]["Enums"]["platform_event_category"]
          conditions: Json
          created_at: string
          created_by: string | null
          description: string | null
          event_type: string
          id: string
          name: string
          priority: number
          rule_key: string
          status: Database["public"]["Enums"]["automation_rule_status"]
          updated_at: string
        }
        Insert: {
          actions?: Json
          category?: Database["public"]["Enums"]["platform_event_category"]
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type: string
          id?: string
          name: string
          priority?: number
          rule_key: string
          status?: Database["public"]["Enums"]["automation_rule_status"]
          updated_at?: string
        }
        Update: {
          actions?: Json
          category?: Database["public"]["Enums"]["platform_event_category"]
          conditions?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_type?: string
          id?: string
          name?: string
          priority?: number
          rule_key?: string
          status?: Database["public"]["Enums"]["automation_rule_status"]
          updated_at?: string
        }
        Relationships: []
      }
      event_subscriptions: {
        Row: {
          created_at: string
          created_by: string | null
          event_type_pattern: string
          id: string
          name: string
          status: Database["public"]["Enums"]["event_subscription_status"]
          subscriber_config: Json
          subscriber_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type_pattern: string
          id?: string
          name: string
          status?: Database["public"]["Enums"]["event_subscription_status"]
          subscriber_config?: Json
          subscriber_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type_pattern?: string
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["event_subscription_status"]
          subscriber_config?: Json
          subscriber_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ledger_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["ledger_account_type"]
          code: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          name: string
          owner_id: string | null
          owner_type: Database["public"]["Enums"]["ledger_owner_type"]
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["ledger_account_type"]
          code: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          name: string
          owner_id?: string | null
          owner_type?: Database["public"]["Enums"]["ledger_owner_type"]
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["ledger_account_type"]
          code?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          name?: string
          owner_id?: string | null
          owner_type?: Database["public"]["Enums"]["ledger_owner_type"]
          updated_at?: string
        }
        Relationships: []
      }
      ledger_entries: {
        Row: {
          account_id: string
          amount: number
          created_at: string
          currency: string
          entry_side: Database["public"]["Enums"]["ledger_entry_side"]
          id: string
          memo: string | null
          transaction_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          currency?: string
          entry_side: Database["public"]["Enums"]["ledger_entry_side"]
          id?: string
          memo?: string | null
          transaction_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          currency?: string
          entry_side?: Database["public"]["Enums"]["ledger_entry_side"]
          id?: string
          memo?: string | null
          transaction_id?: string
        }
        Relationships: []
      }
      ledger_transactions: {
        Row: {
          actor_id: string | null
          created_at: string
          description: string
          id: string
          metadata: Json
          posted_at: string
          reference: string
          reversal_transaction_id: string | null
          reversed_at: string | null
          source_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["ledger_transaction_status"]
          transaction_type: Database["public"]["Enums"]["ledger_transaction_type"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json
          posted_at?: string
          reference: string
          reversal_transaction_id?: string | null
          reversed_at?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["ledger_transaction_status"]
          transaction_type: Database["public"]["Enums"]["ledger_transaction_type"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json
          posted_at?: string
          reference?: string
          reversal_transaction_id?: string | null
          reversed_at?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["ledger_transaction_status"]
          transaction_type?: Database["public"]["Enums"]["ledger_transaction_type"]
        }
        Relationships: []
      }
      settlement_batches: {
        Row: {
          allocation_count: number
          approved_by: string | null
          batch_reference: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          investment_cycle_id: string | null
          ledger_transaction_id: string | null
          notes: string | null
          status: Database["public"]["Enums"]["settlement_batch_status"]
          total_amount: number
          updated_at: string
        }
        Insert: {
          allocation_count?: number
          approved_by?: string | null
          batch_reference: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          investment_cycle_id?: string | null
          ledger_transaction_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["settlement_batch_status"]
          total_amount?: number
          updated_at?: string
        }
        Update: {
          allocation_count?: number
          approved_by?: string | null
          batch_reference?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          investment_cycle_id?: string | null
          ledger_transaction_id?: string | null
          notes?: string | null
          status?: Database["public"]["Enums"]["settlement_batch_status"]
          total_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      investment_allocations: {
        Row: {
          allocated_at: string
          amount: number
          created_at: string
          currency: string
          funding_confirmed_at: string | null
          id: string
          investment_cycle_id: string
          investor_id: string
          locked_at: string | null
          reference_number: string
          settled_at: string | null
          settlement_transaction_id: string | null
          status: Database["public"]["Enums"]["investment_allocation_status"]
          updated_at: string
        }
        Insert: {
          allocated_at?: string
          amount: number
          created_at?: string
          currency?: string
          funding_confirmed_at?: string | null
          id?: string
          investment_cycle_id: string
          investor_id: string
          locked_at?: string | null
          reference_number: string
          settled_at?: string | null
          settlement_transaction_id?: string | null
          status?: Database["public"]["Enums"]["investment_allocation_status"]
          updated_at?: string
        }
        Update: {
          allocated_at?: string
          amount?: number
          created_at?: string
          currency?: string
          funding_confirmed_at?: string | null
          id?: string
          investment_cycle_id?: string
          investor_id?: string
          locked_at?: string | null
          reference_number?: string
          settled_at?: string | null
          settlement_transaction_id?: string | null
          status?: Database["public"]["Enums"]["investment_allocation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_allocations_investment_cycle_id_fkey"
            columns: ["investment_cycle_id"]
            isOneToOne: false
            referencedRelation: "investment_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_allocations_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      investment_cycles: {
        Row: {
          approved_at: string | null
          archived_at: string | null
          closing_date: string | null
          completed_at: string | null
          created_at: string
          cycle_number: number
          description: string | null
          distribution_started_at: string | null
          duration_days: number | null
          fund_id: string | null
          funding_deadline: string | null
          funding_started_at: string | null
          id: string
          investor_count: number
          max_capacity: number | null
          min_investment: number | null
          name: string
          opening_date: string | null
          pool_config_snapshot: Json
          pool_manager_id: string
          pool_version: number
          raised_capital: number
          slug: string
          status: Database["public"]["Enums"]["investment_cycle_status"]
          strategy_id: string
          submitted_at: string | null
          target_capital: number | null
          trading_started_at: string | null
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          archived_at?: string | null
          closing_date?: string | null
          completed_at?: string | null
          created_at?: string
          cycle_number?: number
          description?: string | null
          distribution_started_at?: string | null
          duration_days?: number | null
          fund_id?: string | null
          funding_deadline?: string | null
          funding_started_at?: string | null
          id?: string
          investor_count?: number
          max_capacity?: number | null
          min_investment?: number | null
          name: string
          opening_date?: string | null
          pool_config_snapshot?: Json
          pool_manager_id: string
          pool_version?: number
          raised_capital?: number
          slug: string
          status?: Database["public"]["Enums"]["investment_cycle_status"]
          strategy_id: string
          submitted_at?: string | null
          target_capital?: number | null
          trading_started_at?: string | null
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          archived_at?: string | null
          closing_date?: string | null
          completed_at?: string | null
          created_at?: string
          cycle_number?: number
          description?: string | null
          distribution_started_at?: string | null
          duration_days?: number | null
          fund_id?: string | null
          funding_deadline?: string | null
          funding_started_at?: string | null
          id?: string
          investor_count?: number
          max_capacity?: number | null
          min_investment?: number | null
          name?: string
          opening_date?: string | null
          pool_config_snapshot?: Json
          pool_manager_id?: string
          pool_version?: number
          raised_capital?: number
          slug?: string
          status?: Database["public"]["Enums"]["investment_cycle_status"]
          strategy_id?: string
          submitted_at?: string | null
          target_capital?: number | null
          trading_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investment_cycles_fund_id_fkey"
            columns: ["fund_id"]
            isOneToOne: false
            referencedRelation: "funds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_cycles_pool_manager_id_fkey"
            columns: ["pool_manager_id"]
            isOneToOne: false
            referencedRelation: "pool_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investment_cycles_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      strategies: {
        Row: {
          approved_at: string | null
          archived_at: string | null
          created_at: string
          description: string | null
          id: string
          investment_style: string | null
          name: string
          objectives: string | null
          pool_manager_id: string
          risk_profile: Database["public"]["Enums"]["strategy_risk_profile"] | null
          slug: string
          status: Database["public"]["Enums"]["strategy_status"]
          submitted_at: string | null
          supported_assets: string[]
          updated_at: string
          visibility: Database["public"]["Enums"]["strategy_visibility"]
          pending_revision: Json | null
          revision_status: string
        }
        Insert: {
          approved_at?: string | null
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          investment_style?: string | null
          name: string
          objectives?: string | null
          pool_manager_id: string
          risk_profile?: Database["public"]["Enums"]["strategy_risk_profile"] | null
          slug: string
          status?: Database["public"]["Enums"]["strategy_status"]
          submitted_at?: string | null
          supported_assets?: string[]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["strategy_visibility"]
          pending_revision?: Json | null
          revision_status?: string
        }
        Update: {
          approved_at?: string | null
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          investment_style?: string | null
          name?: string
          objectives?: string | null
          pool_manager_id?: string
          risk_profile?: Database["public"]["Enums"]["strategy_risk_profile"] | null
          slug?: string
          status?: Database["public"]["Enums"]["strategy_status"]
          submitted_at?: string | null
          supported_assets?: string[]
          updated_at?: string
          visibility?: Database["public"]["Enums"]["strategy_visibility"]
          pending_revision?: Json | null
          revision_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "strategies_pool_manager_id_fkey"
            columns: ["pool_manager_id"]
            isOneToOne: false
            referencedRelation: "pool_managers"
            referencedColumns: ["id"]
          },
        ]
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
      notification_history: {
        Row: {
          body: string
          channel: string
          communication_id: string | null
          created_at: string
          delivered_at: string
          id: string
          metadata: Json
          notification_queue_id: string | null
          platform_event_id: string | null
          recipient_user_id: string
          status: Database["public"]["Enums"]["notification_history_status"]
          template_slug: string
          title: string
        }
        Insert: {
          body: string
          channel: string
          communication_id?: string | null
          created_at?: string
          delivered_at?: string
          id?: string
          metadata?: Json
          notification_queue_id?: string | null
          platform_event_id?: string | null
          recipient_user_id: string
          status?: Database["public"]["Enums"]["notification_history_status"]
          template_slug: string
          title: string
        }
        Update: {
          body?: string
          channel?: string
          communication_id?: string | null
          created_at?: string
          delivered_at?: string
          id?: string
          metadata?: Json
          notification_queue_id?: string | null
          platform_event_id?: string | null
          recipient_user_id?: string
          status?: Database["public"]["Enums"]["notification_history_status"]
          template_slug?: string
          title?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          category: Database["public"]["Enums"]["communication_category"]
          channels: string[]
          created_at: string
          error_message: string | null
          id: string
          metadata: Json
          next_retry_at: string | null
          platform_event_id: string | null
          priority: Database["public"]["Enums"]["communication_priority"]
          processed_at: string | null
          recipient_user_id: string
          retry_count: number
          status: Database["public"]["Enums"]["notification_queue_status"]
          template_slug: string
          variables: Json
        }
        Insert: {
          category?: Database["public"]["Enums"]["communication_category"]
          channels?: string[]
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          next_retry_at?: string | null
          platform_event_id?: string | null
          priority?: Database["public"]["Enums"]["communication_priority"]
          processed_at?: string | null
          recipient_user_id: string
          retry_count?: number
          status?: Database["public"]["Enums"]["notification_queue_status"]
          template_slug: string
          variables?: Json
        }
        Update: {
          category?: Database["public"]["Enums"]["communication_category"]
          channels?: string[]
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          next_retry_at?: string | null
          platform_event_id?: string | null
          priority?: Database["public"]["Enums"]["communication_priority"]
          processed_at?: string | null
          recipient_user_id?: string
          retry_count?: number
          status?: Database["public"]["Enums"]["notification_queue_status"]
          template_slug?: string
          variables?: Json
        }
        Relationships: []
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
      platform_events: {
        Row: {
          actor_id: string | null
          category: Database["public"]["Enums"]["platform_event_category"]
          correlation_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          error_message: string | null
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          severity: Database["public"]["Enums"]["platform_event_severity"]
          status: Database["public"]["Enums"]["platform_event_status"]
        }
        Insert: {
          actor_id?: string | null
          category?: Database["public"]["Enums"]["platform_event_category"]
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          severity?: Database["public"]["Enums"]["platform_event_severity"]
          status?: Database["public"]["Enums"]["platform_event_status"]
        }
        Update: {
          actor_id?: string | null
          category?: Database["public"]["Enums"]["platform_event_category"]
          correlation_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          severity?: Database["public"]["Enums"]["platform_event_severity"]
          status?: Database["public"]["Enums"]["platform_event_status"]
        }
        Relationships: []
      }
      investor_manager_follows: {
        Row: {
          id: string
          investor_id: string
          pool_manager_id: string
          created_at: string
        }
        Insert: {
          id?: string
          investor_id: string
          pool_manager_id: string
          created_at?: string
        }
        Update: {
          id?: string
          investor_id?: string
          pool_manager_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "investor_manager_follows_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "investor_manager_follows_pool_manager_id_fkey"
            columns: ["pool_manager_id"]
            isOneToOne: false
            referencedRelation: "pool_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_manager_reviews: {
        Row: {
          id: string
          investor_id: string
          pool_manager_id: string
          investment_cycle_id: string
          investment_allocation_id: string
          rating: number
          message: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          investor_id: string
          pool_manager_id: string
          investment_cycle_id: string
          investment_allocation_id: string
          rating: number
          message: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          investor_id?: string
          pool_manager_id?: string
          investment_cycle_id?: string
          investment_allocation_id?: string
          rating?: number
          message?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_manager_reviews_investor_id_fkey"
            columns: ["investor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_manager_reviews_pool_manager_id_fkey"
            columns: ["pool_manager_id"]
            isOneToOne: false
            referencedRelation: "pool_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_manager_reviews_investment_cycle_id_fkey"
            columns: ["investment_cycle_id"]
            isOneToOne: false
            referencedRelation: "investment_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_manager_reviews_investment_allocation_id_fkey"
            columns: ["investment_allocation_id"]
            isOneToOne: false
            referencedRelation: "investment_allocations"
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
          account_broker: string | null
          account_investor_password: string | null
          account_login: string | null
          account_password: string | null
          account_server: string | null
          admin_rules: string | null
          amount_paid: number | null
          application_id: string | null
          assigned_at: string | null
          assigned_by: string | null
          challenge_account_details: string | null
          challenge_id: string
          challenge_template_id: string | null
          created_at: string
          id: string
          initial_balance: number | null
          payment_method: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_broker?: string | null
          account_investor_password?: string | null
          account_login?: string | null
          account_password?: string | null
          account_server?: string | null
          admin_rules?: string | null
          amount_paid?: number | null
          application_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          challenge_account_details?: string | null
          challenge_id: string
          challenge_template_id?: string | null
          created_at?: string
          id?: string
          initial_balance?: number | null
          payment_method?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_broker?: string | null
          account_investor_password?: string | null
          account_login?: string | null
          account_password?: string | null
          account_server?: string | null
          admin_rules?: string | null
          amount_paid?: number | null
          application_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          challenge_account_details?: string | null
          challenge_id?: string
          challenge_template_id?: string | null
          created_at?: string
          id?: string
          initial_balance?: number | null
          payment_method?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trader_challenge_enrollments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "pool_manager_applications"
            referencedColumns: ["id"]
          },
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
      cycle_progress_events: {
        Row: {
          actor_id: string | null
          created_at: string
          description: string | null
          event_type: Database["public"]["Enums"]["cycle_progress_event_type"]
          id: string
          investment_cycle_id: string
          label: string
          metadata: Json
          occurred_at: string
          phase: Database["public"]["Enums"]["cycle_progress_phase"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          description?: string | null
          event_type: Database["public"]["Enums"]["cycle_progress_event_type"]
          id?: string
          investment_cycle_id: string
          label: string
          metadata?: Json
          occurred_at?: string
          phase: Database["public"]["Enums"]["cycle_progress_phase"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          description?: string | null
          event_type?: Database["public"]["Enums"]["cycle_progress_event_type"]
          id?: string
          investment_cycle_id?: string
          label?: string
          metadata?: Json
          occurred_at?: string
          phase?: Database["public"]["Enums"]["cycle_progress_phase"]
        }
        Relationships: [
          {
            foreignKeyName: "cycle_progress_events_investment_cycle_id_fkey"
            columns: ["investment_cycle_id"]
            isOneToOne: false
            referencedRelation: "investment_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_entries: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          direction: Database["public"]["Enums"]["trade_entry_direction"]
          entry_price: number
          exit_price: number | null
          id: string
          instrument: string
          investment_cycle_id: string
          journal_id: string
          market: string | null
          notes: string | null
          opened_at: string | null
          pool_manager_id: string
          quantity: number
          status: Database["public"]["Enums"]["trade_entry_status"]
          trade_reference: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          direction: Database["public"]["Enums"]["trade_entry_direction"]
          entry_price: number
          exit_price?: number | null
          id?: string
          instrument: string
          investment_cycle_id: string
          journal_id: string
          market?: string | null
          notes?: string | null
          opened_at?: string | null
          pool_manager_id: string
          quantity: number
          status?: Database["public"]["Enums"]["trade_entry_status"]
          trade_reference: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          direction?: Database["public"]["Enums"]["trade_entry_direction"]
          entry_price?: number
          exit_price?: number | null
          id?: string
          instrument?: string
          investment_cycle_id?: string
          journal_id?: string
          market?: string | null
          notes?: string | null
          opened_at?: string | null
          pool_manager_id?: string
          quantity?: number
          status?: Database["public"]["Enums"]["trade_entry_status"]
          trade_reference?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      trade_journals: {
        Row: {
          created_at: string
          id: string
          investment_cycle_id: string
          pool_manager_id: string
          status: Database["public"]["Enums"]["trade_journal_status"]
          strategy_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          investment_cycle_id: string
          pool_manager_id: string
          status?: Database["public"]["Enums"]["trade_journal_status"]
          strategy_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          investment_cycle_id?: string
          pool_manager_id?: string
          status?: Database["public"]["Enums"]["trade_journal_status"]
          strategy_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      trade_snapshots: {
        Row: {
          average_holding_hours: number | null
          closed_positions_count: number
          created_at: string
          created_by: string | null
          current_exposure: number | null
          id: string
          investment_cycle_id: string
          journal_id: string
          losing_trades: number
          metrics: Json
          notes: string | null
          open_positions_count: number
          pool_manager_id: string
          snapshot_at: string
          total_trades: number
          winning_trades: number
        }
        Insert: {
          average_holding_hours?: number | null
          closed_positions_count?: number
          created_at?: string
          created_by?: string | null
          current_exposure?: number | null
          id?: string
          investment_cycle_id: string
          journal_id: string
          losing_trades?: number
          metrics?: Json
          notes?: string | null
          open_positions_count?: number
          pool_manager_id: string
          snapshot_at?: string
          total_trades?: number
          winning_trades?: number
        }
        Update: {
          average_holding_hours?: number | null
          closed_positions_count?: number
          created_at?: string
          created_by?: string | null
          current_exposure?: number | null
          id?: string
          investment_cycle_id?: string
          journal_id?: string
          losing_trades?: number
          metrics?: Json
          notes?: string | null
          open_positions_count?: number
          pool_manager_id?: string
          snapshot_at?: string
          total_trades?: number
          winning_trades?: number
        }
        Relationships: [        ]
      }
      rating_category_weights: {
        Row: {
          category: string
          created_at: string
          id: string
          label: string
          profile_id: string
          updated_at: string
          weight: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          label: string
          profile_id: string
          updated_at?: string
          weight: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          label?: string
          profile_id?: string
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      rating_history: {
        Row: {
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["rating_entity_type"]
          id: string
          new_rating: number
          new_score: number
          previous_rating: number | null
          previous_score: number | null
          profile_id: string | null
          reason: string
          source_metrics: Json
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["rating_entity_type"]
          id?: string
          new_rating: number
          new_score: number
          previous_rating?: number | null
          previous_score?: number | null
          profile_id?: string | null
          reason: string
          source_metrics?: Json
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["rating_entity_type"]
          id?: string
          new_rating?: number
          new_score?: number
          previous_rating?: number | null
          previous_score?: number | null
          profile_id?: string | null
          reason?: string
          source_metrics?: Json
        }
        Relationships: []
      }
      rating_profiles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          rules: Json
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          rules?: Json
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          rules?: Json
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      rating_snapshots: {
        Row: {
          category_scores: Json
          computed_at: string
          confidence_score: number | null
          consistency_score: number | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["rating_entity_type"]
          explanations: Json
          governance_grade: string | null
          id: string
          operational_score: number | null
          overall_rating: number | null
          overall_score: number
          performance_grade: string | null
          profile_id: string
          risk_grade: string | null
          source_metrics: Json
          trend: string
        }
        Insert: {
          category_scores?: Json
          computed_at?: string
          confidence_score?: number | null
          consistency_score?: number | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["rating_entity_type"]
          explanations?: Json
          governance_grade?: string | null
          id?: string
          operational_score?: number | null
          overall_rating?: number | null
          overall_score: number
          performance_grade?: string | null
          profile_id: string
          risk_grade?: string | null
          source_metrics?: Json
          trend?: string
        }
        Update: {
          category_scores?: Json
          computed_at?: string
          confidence_score?: number | null
          consistency_score?: number | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["rating_entity_type"]
          explanations?: Json
          governance_grade?: string | null
          id?: string
          operational_score?: number | null
          overall_rating?: number | null
          overall_score?: number
          performance_grade?: string | null
          profile_id?: string
          risk_grade?: string | null
          source_metrics?: Json
          trend?: string
        }
        Relationships: []
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
      webhook_deliveries: {
        Row: {
          created_at: string
          delivered_at: string | null
          error_message: string | null
          http_status: number | null
          id: string
          next_retry_at: string | null
          payload: Json
          platform_event_id: string | null
          response_body: string | null
          retry_count: number
          signature: string | null
          status: Database["public"]["Enums"]["webhook_delivery_status"]
          webhook_id: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          next_retry_at?: string | null
          payload?: Json
          platform_event_id?: string | null
          response_body?: string | null
          retry_count?: number
          signature?: string | null
          status?: Database["public"]["Enums"]["webhook_delivery_status"]
          webhook_id: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          http_status?: number | null
          id?: string
          next_retry_at?: string | null
          payload?: Json
          platform_event_id?: string | null
          response_body?: string | null
          retry_count?: number
          signature?: string | null
          status?: Database["public"]["Enums"]["webhook_delivery_status"]
          webhook_id?: string
        }
        Relationships: []
      }
      webhook_registrations: {
        Row: {
          created_at: string
          created_by: string | null
          event_type_pattern: string
          id: string
          is_active: boolean
          name: string
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type_pattern?: string
          id?: string
          is_active?: boolean
          name: string
          secret: string
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type_pattern?: string
          id?: string
          is_active?: boolean
          name?: string
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
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
      get_approved_pool_manager_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      automation_rule_status: "active" | "inactive"
      event_subscription_status: "active" | "inactive"
      notification_history_status: "delivered" | "failed" | "skipped" | "cancelled"
      notification_queue_status: "pending" | "processing" | "sent" | "failed" | "cancelled"
      platform_event_category:
        | "investment"
        | "financial"
        | "operations"
        | "performance"
        | "governance"
        | "administration"
        | "security"
        | "system"
      platform_event_severity: "info" | "warning" | "error" | "critical"
      platform_event_status: "pending" | "processing" | "processed" | "failed" | "archived"
      webhook_delivery_status: "pending" | "processing" | "delivered" | "failed" | "cancelled"
      rating_entity_type: "pool_manager" | "strategy" | "investment_cycle"
      cycle_progress_event_type:
        | "status_change"
        | "trade_opened"
        | "trade_closed"
        | "trade_edited"
        | "snapshot_created"
        | "admin_review"
        | "operational_flag"
        | "cycle_advanced"
      cycle_progress_phase:
        | "funding"
        | "trading"
        | "monitoring"
        | "distribution_pending"
        | "completed"
      trade_entry_direction: "long" | "short"
      trade_entry_status:
        | "draft"
        | "open"
        | "partially_closed"
        | "closed"
        | "archived"
      trade_journal_status: "active" | "archived"
      investment_allocation_status:
        | "pending"
        | "funding_confirmed"
        | "confirmed"
        | "settled"
        | "locked"
        | "distributed"
        | "cancelled"
        | "rejected"
      distribution_record_status:
        | "preparation"
        | "batch"
        | "pending"
        | "approved"
        | "completed"
        | "cancelled"
      financial_adjustment_status: "pending" | "approved" | "posted" | "rejected"
      ledger_account_type: "asset" | "liability" | "equity" | "revenue" | "expense"
      ledger_entry_side: "debit" | "credit"
      ledger_owner_type:
        | "platform"
        | "investor"
        | "pool_manager"
        | "investment_cycle"
        | "investment_allocation"
      ledger_transaction_status: "pending" | "posted" | "reversed"
      ledger_transaction_type:
        | "opening_balance"
        | "deposit_credit"
        | "allocation_reserve"
        | "allocation_settlement"
        | "allocation_release"
        | "distribution"
        | "adjustment"
        | "reversal"
        | "transfer"
        | "profit_settlement"
        | "platform_service_fee"
        | "pool_manager_earnings"
        | "profit_distribution"
      profit_settlement_status:
        | "calculated"
        | "pending_review"
        | "confirmed"
        | "distributing"
        | "completed"
        | "cancelled"
      settlement_batch_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
      investment_cycle_status:
        | "draft"
        | "submitted"
        | "approved"
        | "funding"
        | "trading"
        | "distribution"
        | "completed"
        | "archived"
      strategy_risk_profile:
        | "conservative"
        | "balanced"
        | "moderate"
        | "aggressive"
        | "speculative"
      strategy_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "available"
        | "operating"
        | "paused"
        | "archived"
      strategy_visibility: "private" | "internal" | "public"
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
