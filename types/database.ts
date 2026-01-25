// 通報対象の種類（post: 投稿, comment: コメント）
export type ReportContentType = 'post' | 'comment';
// Match型をエクスポート
export type Match = Database['public']['Tables']['matches']['Row'];

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
            audit_logs: {
              Row: {
                id: string;
                user_id: string | null;
                event_type: string;
                target_table: string | null;
                target_id: string | null;
                description: string | null;
                ip_address: string | null;
                user_agent: string | null;
                created_at: string;
              };
              Insert: {
                id?: string;
                user_id?: string | null;
                event_type: string;
                target_table?: string | null;
                target_id?: string | null;
                description?: string | null;
                ip_address?: string | null;
                user_agent?: string | null;
                created_at?: string;
              };
              Update: {
                id?: string;
                user_id?: string | null;
                event_type?: string;
                target_table?: string | null;
                target_id?: string | null;
                description?: string | null;
                ip_address?: string | null;
                user_agent?: string | null;
                created_at?: string;
              };
              Relationships: [
                {
                  foreignKeyName: "audit_logs_user_id_fkey";
                  columns: ["user_id"];
                  isOneToOne: false;
                  referencedRelation: "users";
                  referencedColumns: ["id"];
                }
              ];
            };
      email_verification_attempts: {
        Row: {
          attempted_at: string
          created_at: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          attempted_at?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          attempted_at?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_verification_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          order_index: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          order_index?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          order_index?: number | null
        }
        Relationships: []
      }
      forum_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          moderation_status: string
          post_id: string
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          moderation_status?: string
          post_id: string
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          moderation_status?: string
          post_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_posts: {
        Row: {
          author_id: string
          category_id: string | null
          content: string
          created_at: string | null
          id: string
          is_locked: boolean | null
          is_pinned: boolean | null
          moderation_status: string
          title: string
          updated_at: string | null
          user_type: string
          view_count: number | null
        }
        Insert: {
          author_id: string
          category_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          moderation_status?: string
          title: string
          updated_at?: string | null
          user_type?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string
          category_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_locked?: boolean | null
          is_pinned?: boolean | null
          moderation_status?: string
          title?: string
          updated_at?: string | null
          user_type?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "forum_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "forum_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      forum_reports: {
        Row: {
          created_at: string | null
          id: string
          report_details: string | null
          report_reason: string
          reported_content_id: string
          reported_content_type: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          report_details?: string | null
          report_reason: string
          reported_content_id: string
          reported_content_type: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          report_details?: string | null
          report_reason?: string
          reported_content_id?: string
          reported_content_type?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "forum_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "forum_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_verifications: {
        Row: {
          created_at: string | null
          id: string
          status: string | null
          updated_at: string | null
          user_id: string | null
          verification_data: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_data?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          child_id: string
          created_at: string | null
          id: string
          parent_id: string
          similarity_score: number
          status: string
          updated_at: string | null
          blocked_by: string | null // 追加: ブロックしたユーザーID
        }
        Insert: {
          child_id: string
          created_at?: string | null
          id?: string
          parent_id: string
          similarity_score: number
          status?: string
          updated_at?: string | null
          blocked_by?: string | null
        }
        Update: {
          child_id?: string
          created_at?: string | null
          id?: string
          parent_id?: string
          similarity_score?: number
          status?: string
          updated_at?: string | null
          blocked_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          match_id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          match_id: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          match_id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      passkeys: {
        Row: {
          counter: number
          created_at: string
          credential_id: string
          device_name: string | null
          id: string
          last_used_at: string | null
          public_key: string
          transports: string[] | null
          user_id: string
        }
        Insert: {
          counter?: number
          created_at?: string
          credential_id: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key: string
          transports?: string[] | null
          user_id: string
        }
        Update: {
          counter?: number
          created_at?: string
          credential_id?: string
          device_name?: string | null
          id?: string
          last_used_at?: string | null
          public_key?: string
          transports?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          bio: string | null
          birth_date: string
          birthplace_municipality: string | null
          birthplace_prefecture: string | null
          created_at: string | null
          first_name_hiragana: string | null
          first_name_kanji: string | null
          forum_display_name: string | null
          gender: string | null
          id: string
          last_name_hiragana: string | null
          last_name_kanji: string | null
          parent_gender: string | null
          profile_image_url: string | null
          target_person_birth_date: string | null
          target_person_name_hiragana: string | null
          target_person_name_kanji: string | null
          updated_at: string | null
          user_id: string
          role: string | null
        }
        Insert: {
          bio?: string | null
          birth_date: string
          birthplace_municipality?: string | null
          birthplace_prefecture?: string | null
          created_at?: string | null
          first_name_hiragana?: string | null
          first_name_kanji?: string | null
          forum_display_name?: string | null
          gender?: string | null
          id?: string
          last_name_hiragana?: string | null
          last_name_kanji?: string | null
          parent_gender?: string | null
          profile_image_url?: string | null
          target_person_birth_date?: string | null
          target_person_name_hiragana?: string | null
          target_person_name_kanji?: string | null
          updated_at?: string | null
          user_id: string
          role?: string | null
        }
        Update: {
          bio?: string | null
          birth_date?: string
          birthplace_municipality?: string | null
          birthplace_prefecture?: string | null
          created_at?: string | null
          first_name_hiragana?: string | null
          first_name_kanji?: string | null
          forum_display_name?: string | null
          gender?: string | null
          id?: string
          last_name_hiragana?: string | null
          last_name_kanji?: string | null
          parent_gender?: string | null
          profile_image_url?: string | null
          target_person_birth_date?: string | null
          target_person_name_hiragana?: string | null
          target_person_name_kanji?: string | null
          updated_at?: string | null
          user_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          action_timestamp: string
          action_type: string
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
          ip_address: string | null
        }
        Insert: {
          action_timestamp?: string
          action_type: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
          ip_address?: string | null
        }
        Update: {
          action_timestamp?: string
          action_type?: string
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_limits_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "forum_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_limits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      target_people: {
        Row: {
          birth_date: string | null
          birthplace_municipality: string | null
          birthplace_prefecture: string | null
          created_at: string | null
          display_order: number | null
          first_name_hiragana: string | null
          first_name_kanji: string | null
          gender: string | null
          id: string
          last_name_hiragana: string | null
          last_name_kanji: string | null
          name_hiragana: string | null
          name_kanji: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          birthplace_municipality?: string | null
          birthplace_prefecture?: string | null
          created_at?: string | null
          display_order?: number | null
          first_name_hiragana?: string | null
          first_name_kanji?: string | null
          gender?: string | null
          id?: string
          last_name_hiragana?: string | null
          last_name_kanji?: string | null
          name_hiragana?: string | null
          name_kanji?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          birth_date?: string | null
          birthplace_municipality?: string | null
          birthplace_prefecture?: string | null
          created_at?: string | null
          display_order?: number | null
          first_name_hiragana?: string | null
          first_name_kanji?: string | null
          gender?: string | null
          id?: string
          last_name_hiragana?: string | null
          last_name_kanji?: string | null
          name_hiragana?: string | null
          name_kanji?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      target_people_photos: {
        Row: {
          age_at_capture: number | null
          captured_at: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          photo_url: string
          target_person_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          age_at_capture?: number | null
          captured_at?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          photo_url: string
          target_person_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          age_at_capture?: number | null
          captured_at?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          photo_url?: string
          target_person_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "target_people_photos_target_person_id_fkey"
            columns: ["target_person_id"]
            isOneToOne: false
            referencedRelation: "target_people"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          id?: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          email_verified_at: string | null
          full_name: string | null
          id: string
          mynumber_verified: boolean | null
          phone_number: string | null
          role: string | null
          updated_at: string | null
          verification_status: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          email_verified_at?: string | null
          full_name?: string | null
          id?: string
          mynumber_verified?: boolean | null
          phone_number?: string | null
          role?: string | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          email_verified_at?: string | null
          full_name?: string | null
          id?: string
          mynumber_verified?: boolean | null
          phone_number?: string | null
          role?: string | null
          updated_at?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      matches_with_details: {
        Row: {
          child_first_name_kanji: string | null
          child_id: string | null
          child_last_name_kanji: string | null
          child_profile_image_url: string | null
          child_role: string | null
          created_at: string | null
          id: string | null
          parent_first_name_kanji: string | null
          parent_id: string | null
          parent_last_name_kanji: string | null
          parent_profile_image_url: string | null
          parent_role: string | null
          similarity_score: number | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_target_people_limit: {
        Args: { arg1: string }
        Returns: boolean
      }
      clean_old_rate_limits: { Args: never; Returns: undefined }
      cleanup_old_verification_attempts: { Args: never; Returns: undefined }
      get_last_message: {
        Args: { p_match_id: string }
        Returns: {
          content: string
          created_at: string
          sender_id: string
        }[]
      }
      get_report_count: {
        Args: { content_id: string; content_type: string }
        Returns: number
      }
      get_unread_message_count: {
        Args: { p_match_id: string; p_user_id: string }
        Returns: number
      }
      has_user_reported: {
        Args: { content_id: string; content_type: string; user_id: string }
        Returns: boolean
      }
      increment_post_view_count: {
        Args: { post_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
