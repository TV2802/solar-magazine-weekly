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
      article_feedback: {
        Row: {
          article_id: string
          created_at: string
          id: string
          session_id: string
          vote: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          session_id: string
          vote: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          session_id?: string
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_featured: boolean
          issue_id: string | null
          published_at: string | null
          relevance_score: number | null
          source_name: string | null
          source_url: string
          summary: string | null
          title: string
          topic: Database["public"]["Enums"]["topic_category"]
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          issue_id?: string | null
          published_at?: string | null
          relevance_score?: number | null
          source_name?: string | null
          source_url: string
          summary?: string | null
          title: string
          topic: Database["public"]["Enums"]["topic_category"]
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          issue_id?: string | null
          published_at?: string | null
          relevance_score?: number | null
          source_name?: string | null
          source_url?: string
          summary?: string | null
          title?: string
          topic?: Database["public"]["Enums"]["topic_category"]
        }
        Relationships: [
          {
            foreignKeyName: "articles_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      incentive_status: {
        Row: {
          id: string
          notes: string | null
          program_name: string
          state: string
          status: string
          updated_at: string
        }
        Insert: {
          id?: string
          notes?: string | null
          program_name: string
          state: string
          status?: string
          updated_at?: string
        }
        Update: {
          id?: string
          notes?: string | null
          program_name?: string
          state?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      issues: {
        Row: {
          created_at: string
          digest_text: string | null
          id: string
          issue_number: number
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          digest_text?: string | null
          id?: string
          issue_number: number
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          digest_text?: string | null
          id?: string
          issue_number?: number
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      market_metrics: {
        Row: {
          id: string
          metric_name: string
          notes: string | null
          trend: string
          unit: string
          updated_at: string
          value: number
        }
        Insert: {
          id?: string
          metric_name: string
          notes?: string | null
          trend?: string
          unit: string
          updated_at?: string
          value: number
        }
        Update: {
          id?: string
          metric_name?: string
          notes?: string | null
          trend?: string
          unit?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      pvwatts_cache: {
        Row: {
          ac_annual: number | null
          capacity_factor: number | null
          fetched_at: string
          id: string
          state_id: string
          state_name: string
        }
        Insert: {
          ac_annual?: number | null
          capacity_factor?: number | null
          fetched_at?: string
          id?: string
          state_id: string
          state_name: string
        }
        Update: {
          ac_annual?: number | null
          capacity_factor?: number | null
          fetched_at?: string
          id?: string
          state_id?: string
          state_name?: string
        }
        Relationships: []
      }
      saved_articles: {
        Row: {
          article_id: string
          created_at: string
          id: string
          session_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          session_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_articles_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      topic_category:
        | "solar"
        | "multifamily"
        | "battery"
        | "built_environment"
        | "new_innovations"
        | "company_success"
        | "policy_incentives"
        | "technology_equipment"
        | "multifamily_nexus"
        | "market_pricing"
        | "code_compliance"
        | "bess_storage"
        | "innovation_spotlight"
        | "project_wins"
        | "weekly_digest"
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
      topic_category: [
        "solar",
        "multifamily",
        "battery",
        "built_environment",
        "new_innovations",
        "company_success",
        "policy_incentives",
        "technology_equipment",
        "multifamily_nexus",
        "market_pricing",
        "code_compliance",
        "bess_storage",
        "innovation_spotlight",
        "project_wins",
        "weekly_digest",
      ],
    },
  },
} as const
