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
      banned_users: {
        Row: {
          banned_at: string
          banned_by: string | null
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string
          banned_by?: string | null
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string
          banned_by?: string | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      corbeille: {
        Row: {
          content: Json
          deleted_at: string | null
          deleted_by: string
          id: string
          item_type: string
          original_id: string
        }
        Insert: {
          content: Json
          deleted_at?: string | null
          deleted_by: string
          id?: string
          item_type: string
          original_id: string
        }
        Update: {
          content?: Json
          deleted_at?: string | null
          deleted_by?: string
          id?: string
          item_type?: string
          original_id?: string
        }
        Relationships: []
      }
      dissolutions: {
        Row: {
          created_at: string | null
          description: string | null
          dissolution_date: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          dissolution_date?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          dissolution_date?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      echanges: {
        Row: {
          created_at: string | null
          description: string | null
          echange_date: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          echange_date?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          echange_date?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      entretiens: {
        Row: {
          candidate_name: string
          created_at: string | null
          group_name: string | null
          id: string
          status: string | null
          summary: string
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          candidate_name: string
          created_at?: string | null
          group_name?: string | null
          id?: string
          status?: string | null
          summary: string
          updated_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          candidate_name?: string
          created_at?: string | null
          group_name?: string | null
          id?: string
          status?: string | null
          summary?: string
          updated_at?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      group_members: {
        Row: {
          created_at: string
          group_name: string
          id: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          group_name: string
          id?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          group_name?: string
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          user_id: string
          username: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          user_id: string
          username: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      mission_proposals: {
        Row: {
          created_at: string
          description: string
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      operations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          operation_date: string | null
          status: string | null
          title: string
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          operation_date?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          operation_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      people: {
        Row: {
          created_at: string | null
          discord_id: string | null
          id: string
          role: string
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          discord_id?: string | null
          id?: string
          role: string
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          discord_id?: string | null
          id?: string
          role?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          discord_id: string | null
          id: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          discord_id?: string | null
          id?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          discord_id?: string | null
          id?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      qg: {
        Row: {
          created_at: string
          id: string
          name: string
          pos_x: number
          pos_y: number
          responsible_name: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pos_x?: number
          pos_y?: number
          responsible_name: string
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pos_x?: number
          pos_y?: number
          responsible_name?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      rapports: {
        Row: {
          author_name: string
          created_at: string | null
          created_by: string
          id: string
          rapport_date: string
          summary: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          author_name: string
          created_at?: string | null
          created_by: string
          id?: string
          rapport_date: string
          summary: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          author_name?: string
          created_at?: string | null
          created_by?: string
          id?: string
          rapport_date?: string
          summary?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reunions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          reunion_date: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          reunion_date?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          reunion_date?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_groups: {
        Row: {
          created_at: string | null
          group_name: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          group_name: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          group_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string | null
          entretien_id: string | null
          id: string
          user_id: string | null
          vote: boolean
        }
        Insert: {
          created_at?: string | null
          entretien_id?: string | null
          id?: string
          user_id?: string | null
          vote: boolean
        }
        Update: {
          created_at?: string | null
          entretien_id?: string | null
          id?: string
          user_id?: string | null
          vote?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "votes_entretien_id_fkey"
            columns: ["entretien_id"]
            isOneToOne: false
            referencedRelation: "entretiens"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_user_to_group: {
        Args: { p_group_name: string; p_user_id: string }
        Returns: Json
      }
      add_user_to_group_fn: {
        Args: { p_group_name: string; p_user_id: string }
        Returns: undefined
      }
      create_user_profile: {
        Args: {
          p_avatar_url?: string
          p_discord_id: string
          p_user_id: string
          p_username: string
        }
        Returns: undefined
      }
      create_user_role: {
        Args: {
          p_role?: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      get_all_groups: { Args: never; Returns: Json }
      get_user_groups: {
        Args: never
        Returns: {
          group_name: string
          user_ids: string[]
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      remove_user_from_group: {
        Args: { p_group_name: string; p_user_id: string }
        Returns: Json
      }
      remove_user_from_group_fn: {
        Args: { p_group_name: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "responsable" | "membre"
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
      app_role: ["admin", "responsable", "membre"],
    },
  },
} as const

