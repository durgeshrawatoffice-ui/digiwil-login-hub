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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          new_value: string | null
          old_value: string | null
          school_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          school_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          call_notes: string | null
          call_status: string
          caller_name: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          school_id: string
          user_id: string
        }
        Insert: {
          call_notes?: string | null
          call_status: string
          caller_name?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          school_id: string
          user_id: string
        }
        Update: {
          call_notes?: string | null
          call_status?: string
          caller_name?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_submissions: {
        Row: {
          created_at: string
          data: Json
          id: string
          page_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          page_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_submissions_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_pages: {
        Row: {
          button_text: string
          created_at: string
          description: string | null
          fields: Json
          headline: string
          id: string
          is_published: boolean
          slug: string
          submissions_count: number
          thank_you_message: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          button_text?: string
          created_at?: string
          description?: string | null
          fields?: Json
          headline?: string
          id?: string
          is_published?: boolean
          slug: string
          submissions_count?: number
          thank_you_message?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          button_text?: string
          created_at?: string
          description?: string | null
          fields?: Json
          headline?: string
          id?: string
          is_published?: boolean
          slug?: string
          submissions_count?: number
          thank_you_message?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_assignments: {
        Row: {
          assigned_by: string
          assigned_to: string
          created_at: string
          due_date: string | null
          id: string
          notes: string | null
          priority: string
          progress_percentage: number
          school_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_to: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          progress_percentage?: number
          school_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_to?: string
          created_at?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          priority?: string
          progress_percentage?: number
          school_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      nurture_sequences: {
        Row: {
          channel: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      outreach_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          id: string
          name: string
          pipeline_stage: string
          subject: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          id?: string
          name?: string
          pipeline_stage?: string
          subject?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          id?: string
          name?: string
          pipeline_stage?: string
          subject?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          address: string | null
          assigned_name: string | null
          assigned_to: string | null
          call_notes: string | null
          call_status: string | null
          category: string | null
          company_id: string | null
          created_at: string | null
          detected_website: string | null
          discovered: boolean | null
          domain_active: boolean | null
          domain_validated: boolean | null
          emails: string | null
          facebook: string | null
          featured_image: string | null
          follow_up_date: string | null
          follow_up_notes: string | null
          id: string
          instagram: string | null
          last_error: string | null
          location: string | null
          name: string
          open_hours: string | null
          phone: string | null
          pipeline_stage: string | null
          quality_score: Json | null
          rating: number | null
          rating_info: string | null
          retry_count: number | null
          school_type: string | null
          similarity_score: number | null
          social_medias: string | null
          status: string | null
          trust_reason: string | null
          trust_score: number | null
          twitter: string | null
          updated_at: string | null
          user_id: string | null
          website: string | null
          website_confirmed: boolean | null
          website_type: string | null
        }
        Insert: {
          address?: string | null
          assigned_name?: string | null
          assigned_to?: string | null
          call_notes?: string | null
          call_status?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          detected_website?: string | null
          discovered?: boolean | null
          domain_active?: boolean | null
          domain_validated?: boolean | null
          emails?: string | null
          facebook?: string | null
          featured_image?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          instagram?: string | null
          last_error?: string | null
          location?: string | null
          name: string
          open_hours?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          quality_score?: Json | null
          rating?: number | null
          rating_info?: string | null
          retry_count?: number | null
          school_type?: string | null
          similarity_score?: number | null
          social_medias?: string | null
          status?: string | null
          trust_reason?: string | null
          trust_score?: number | null
          twitter?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          website_confirmed?: boolean | null
          website_type?: string | null
        }
        Update: {
          address?: string | null
          assigned_name?: string | null
          assigned_to?: string | null
          call_notes?: string | null
          call_status?: string | null
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          detected_website?: string | null
          discovered?: boolean | null
          domain_active?: boolean | null
          domain_validated?: boolean | null
          emails?: string | null
          facebook?: string | null
          featured_image?: string | null
          follow_up_date?: string | null
          follow_up_notes?: string | null
          id?: string
          instagram?: string | null
          last_error?: string | null
          location?: string | null
          name?: string
          open_hours?: string | null
          phone?: string | null
          pipeline_stage?: string | null
          quality_score?: Json | null
          rating?: number | null
          rating_info?: string | null
          retry_count?: number | null
          school_type?: string | null
          similarity_score?: number | null
          social_medias?: string | null
          status?: string | null
          trust_reason?: string | null
          trust_score?: number | null
          twitter?: string | null
          updated_at?: string | null
          user_id?: string | null
          website?: string | null
          website_confirmed?: boolean | null
          website_type?: string | null
        }
        Relationships: []
      }
      sequence_enrollments: {
        Row: {
          current_step: number
          enrolled_at: string
          id: string
          last_step_at: string | null
          school_id: string
          sequence_id: string
          status: string
          user_id: string
        }
        Insert: {
          current_step?: number
          enrolled_at?: string
          id?: string
          last_step_at?: string | null
          school_id: string
          sequence_id: string
          status?: string
          user_id: string
        }
        Update: {
          current_step?: number
          enrolled_at?: string
          id?: string
          last_step_at?: string | null
          school_id?: string
          sequence_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "nurture_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_steps: {
        Row: {
          body: string
          channel: string
          created_at: string
          delay_days: number
          id: string
          sequence_id: string
          step_order: number
          subject: string | null
        }
        Insert: {
          body: string
          channel?: string
          created_at?: string
          delay_days?: number
          id?: string
          sequence_id: string
          step_order?: number
          subject?: string | null
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          delay_days?: number
          id?: string
          sequence_id?: string
          step_order?: number
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "nurture_sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          accepted: boolean | null
          company_id: string | null
          id: string
          invited_at: string
          is_active: boolean | null
          last_login: string | null
          member_email: string
          member_name: string | null
          member_user_id: string | null
          owner_id: string
          permissions: Json | null
          role: string
        }
        Insert: {
          accepted?: boolean | null
          company_id?: string | null
          id?: string
          invited_at?: string
          is_active?: boolean | null
          last_login?: string | null
          member_email: string
          member_name?: string | null
          member_user_id?: string | null
          owner_id: string
          permissions?: Json | null
          role?: string
        }
        Update: {
          accepted?: boolean | null
          company_id?: string | null
          id?: string
          invited_at?: string
          is_active?: boolean | null
          last_login?: string | null
          member_email?: string
          member_name?: string | null
          member_user_id?: string | null
          owner_id?: string
          permissions?: Json | null
          role?: string
        }
        Relationships: []
      }
      whatsapp_sessions: {
        Row: {
          created_at: string | null
          id: string
          session_data: string
          session_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_data: string
          session_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          session_data?: string
          session_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reload_schema_cache: { Args: never; Returns: boolean }
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
