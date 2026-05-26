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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          created_at: string
          duration_sec: number | null
          id: string
          kind: Database["public"]["Enums"]["asset_kind"]
          mime_type: string | null
          name: string
          page: number | null
          position: number
          size_bytes: number
          storage_path: string | null
          text_content: string | null
          user_id: string
          zine_id: string
        }
        Insert: {
          created_at?: string
          duration_sec?: number | null
          id?: string
          kind: Database["public"]["Enums"]["asset_kind"]
          mime_type?: string | null
          name: string
          page?: number | null
          position?: number
          size_bytes?: number
          storage_path?: string | null
          text_content?: string | null
          user_id: string
          zine_id: string
        }
        Update: {
          created_at?: string
          duration_sec?: number | null
          id?: string
          kind?: Database["public"]["Enums"]["asset_kind"]
          mime_type?: string | null
          name?: string
          page?: number | null
          position?: number
          size_bytes?: number
          storage_path?: string | null
          text_content?: string | null
          user_id?: string
          zine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_zine_id_fkey"
            columns: ["zine_id"]
            isOneToOne: false
            referencedRelation: "zines"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          tier: Database["public"]["Enums"]["tier_name"]
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          tier?: Database["public"]["Enums"]["tier_name"]
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          tier?: Database["public"]["Enums"]["tier_name"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      tiers: {
        Row: {
          can_remove_watermark: boolean
          created_at: string
          label: string
          max_zines: number | null
          monthly_price_cents: number
          name: Database["public"]["Enums"]["tier_name"]
          storage_bytes: number
        }
        Insert: {
          can_remove_watermark?: boolean
          created_at?: string
          label: string
          max_zines?: number | null
          monthly_price_cents?: number
          name: Database["public"]["Enums"]["tier_name"]
          storage_bytes: number
        }
        Update: {
          can_remove_watermark?: boolean
          created_at?: string
          label?: string
          max_zines?: number | null
          monthly_price_cents?: number
          name?: Database["public"]["Enums"]["tier_name"]
          storage_bytes?: number
        }
        Relationships: []
      }
      zines: {
        Row: {
          body_font: string
          cover_path: string | null
          created_at: string
          format: Database["public"]["Enums"]["zine_format"]
          header_font: string
          id: string
          ig_ratio: string | null
          published: boolean
          published_at: string | null
          slug: string | null
          text_shape: Database["public"]["Enums"]["text_shape"]
          title: string
          updated_at: string
          user_id: string
          vibe: Database["public"]["Enums"]["zine_vibe"]
          view_count: number
          words: string
        }
        Insert: {
          body_font?: string
          cover_path?: string | null
          created_at?: string
          format?: Database["public"]["Enums"]["zine_format"]
          header_font?: string
          id?: string
          ig_ratio?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string | null
          text_shape?: Database["public"]["Enums"]["text_shape"]
          title?: string
          updated_at?: string
          user_id: string
          vibe?: Database["public"]["Enums"]["zine_vibe"]
          view_count?: number
          words?: string
        }
        Update: {
          body_font?: string
          cover_path?: string | null
          created_at?: string
          format?: Database["public"]["Enums"]["zine_format"]
          header_font?: string
          id?: string
          ig_ratio?: string | null
          published?: boolean
          published_at?: string | null
          slug?: string | null
          text_shape?: Database["public"]["Enums"]["text_shape"]
          title?: string
          updated_at?: string
          user_id?: string
          vibe?: Database["public"]["Enums"]["zine_vibe"]
          view_count?: number
          words?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bump_zine_view: { Args: { _slug: string }; Returns: undefined }
      user_storage_bytes: { Args: { _user_id: string }; Returns: number }
      user_tier_limit: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      asset_kind: "photo" | "video" | "audio" | "text"
      text_shape:
        | "normal"
        | "wavy"
        | "circle"
        | "diagonal"
        | "stacked"
        | "scattered"
        | "outlined"
        | "arc"
      tier_name: "free" | "maker" | "pro"
      zine_format:
        | "single-sheet"
        | "ebook"
        | "printable-zine"
        | "two-page"
        | "instagram"
      zine_vibe:
        | "grain"
        | "editorial"
        | "collage"
        | "typewriter"
        | "minimal"
        | "colorful"
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
      asset_kind: ["photo", "video", "audio", "text"],
      text_shape: [
        "normal",
        "wavy",
        "circle",
        "diagonal",
        "stacked",
        "scattered",
        "outlined",
        "arc",
      ],
      tier_name: ["free", "maker", "pro"],
      zine_format: [
        "single-sheet",
        "ebook",
        "printable-zine",
        "two-page",
        "instagram",
      ],
      zine_vibe: [
        "grain",
        "editorial",
        "collage",
        "typewriter",
        "minimal",
        "colorful",
      ],
    },
  },
} as const
