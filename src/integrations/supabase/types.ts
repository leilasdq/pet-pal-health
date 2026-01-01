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
      ai_usage: {
        Row: {
          analysis_count: number
          chatbot_count: number
          created_at: string
          id: string
          month_year: string
          total_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_count?: number
          chatbot_count?: number
          created_at?: string
          id?: string
          month_year: string
          total_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_count?: number
          chatbot_count?: number
          created_at?: string
          id?: string
          month_year?: string
          total_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          pet_context: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          pet_context?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          pet_context?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          pet_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pet_id?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pet_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          category: string
          created_at: string
          id: string
          image_path: string
          notes: string | null
          pet_id: string
          record_date: string | null
          title: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          image_path: string
          notes?: string | null
          pet_id: string
          record_date?: string | null
          title?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          image_path?: string
          notes?: string | null
          pet_id?: string
          record_date?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_records_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          authority: string | null
          created_at: string
          discount_amount: number
          final_amount: number
          gateway: string
          id: string
          original_amount: number
          promo_code_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          tier_id: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          authority?: string | null
          created_at?: string
          discount_amount?: number
          final_amount: number
          gateway?: string
          id?: string
          original_amount: number
          promo_code_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tier_id: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          authority?: string | null
          created_at?: string
          discount_amount?: number
          final_amount?: number
          gateway?: string
          id?: string
          original_amount?: number
          promo_code_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          tier_id?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      pets: {
        Row: {
          birth_date: string | null
          breed: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          pet_type: string
          updated_at: string
          user_id: string
          weight: number | null
        }
        Insert: {
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          pet_type?: string
          updated_at?: string
          user_id: string
          weight?: number | null
        }
        Update: {
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          pet_type?: string
          updated_at?: string
          user_id?: string
          weight?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          email_notifications_enabled: boolean
          full_name: string | null
          id: string
          preferred_language: string
          push_notifications_enabled: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_notifications_enabled?: boolean
          full_name?: string | null
          id: string
          preferred_language?: string
          push_notifications_enabled?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          email_notifications_enabled?: boolean
          full_name?: string | null
          id?: string
          preferred_language?: string
          push_notifications_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      promo_code_usage: {
        Row: {
          id: string
          payment_id: string | null
          promo_code_id: string
          used_at: string
          user_id: string
        }
        Insert: {
          id?: string
          payment_id?: string | null
          promo_code_id: string
          used_at?: string
          user_id: string
        }
        Update: {
          id?: string
          payment_id?: string | null
          promo_code_id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_payment"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          free_tier_id: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          used_count: number
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          free_tier_id?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          free_tier_id?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          used_count?: number
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_free_tier_id_fkey"
            columns: ["free_tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string
          due_date: string
          id: string
          notes: string | null
          pet_id: string
          recurrence: string
          recurrence_interval: number | null
          reminder_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          pet_id: string
          recurrence?: string
          recurrence_interval?: number | null
          reminder_type: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          pet_id?: string
          recurrence?: string
          recurrence_interval?: number | null
          reminder_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "pets"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_tiers: {
        Row: {
          created_at: string
          display_name_fa: string
          grace_buffer: number
          id: string
          is_active: boolean
          monthly_limit: number
          name: string
          price_toman: number
        }
        Insert: {
          created_at?: string
          display_name_fa: string
          grace_buffer?: number
          id?: string
          is_active?: boolean
          monthly_limit?: number
          name: string
          price_toman?: number
        }
        Update: {
          created_at?: string
          display_name_fa?: string
          grace_buffer?: number
          id?: string
          is_active?: boolean
          monthly_limit?: number
          name?: string
          price_toman?: number
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          promo_code_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          tier_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          promo_code_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tier_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          promo_code_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          tier_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_promo_code"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "subscription_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_tier: {
        Args: { p_user_id: string }
        Returns: {
          grace_buffer: number
          monthly_limit: number
          tier_id: string
          tier_name: string
        }[]
      }
      get_user_usage: {
        Args: { p_user_id: string }
        Returns: {
          analysis_count: number
          chatbot_count: number
          total_count: number
        }[]
      }
    }
    Enums: {
      discount_type: "percentage" | "fixed_amount" | "free_tier"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      subscription_status: "active" | "expired" | "pending" | "cancelled"
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
    Enums: {
      discount_type: ["percentage", "fixed_amount", "free_tier"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      subscription_status: ["active", "expired", "pending", "cancelled"],
    },
  },
} as const
