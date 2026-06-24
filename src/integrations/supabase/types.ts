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
      ai_usage_logs: {
        Row: {
          completion_tokens: number | null
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          model: string
          operation: string | null
          prompt_tokens: number | null
          status: string
          summary: string | null
          total_tokens: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          model: string
          operation?: string | null
          prompt_tokens?: number | null
          status?: string
          summary?: string | null
          total_tokens?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          model?: string
          operation?: string | null
          prompt_tokens?: number | null
          status?: string
          summary?: string | null
          total_tokens?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      azure_ai_integrations: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          api_path: string | null
          api_version: string | null
          apim_base_url: string | null
          apim_route: string | null
          auth_type: string | null
          azure_project_name: string | null
          azure_resource_name: string | null
          capabilities: string[]
          connection_config: Json
          context_type: string
          created_at: string
          created_by: string | null
          default_temperature: number | null
          deployment_name: string | null
          description: string | null
          display_name: string
          endpoint_url: string | null
          foundry_resource_name: string | null
          id: string
          integration_key: string
          is_chat_completion: boolean
          is_enabled: boolean
          is_production: boolean
          is_realtime: boolean
          last_checked_at: string | null
          last_health_message: string | null
          last_health_status: string | null
          max_tokens: number | null
          model_id: string | null
          model_version: string | null
          region: string | null
          resource_type: string | null
          secret_refs: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          api_path?: string | null
          api_version?: string | null
          apim_base_url?: string | null
          apim_route?: string | null
          auth_type?: string | null
          azure_project_name?: string | null
          azure_resource_name?: string | null
          capabilities?: string[]
          connection_config?: Json
          context_type: string
          created_at?: string
          created_by?: string | null
          default_temperature?: number | null
          deployment_name?: string | null
          description?: string | null
          display_name: string
          endpoint_url?: string | null
          foundry_resource_name?: string | null
          id?: string
          integration_key: string
          is_chat_completion?: boolean
          is_enabled?: boolean
          is_production?: boolean
          is_realtime?: boolean
          last_checked_at?: string | null
          last_health_message?: string | null
          last_health_status?: string | null
          max_tokens?: number | null
          model_id?: string | null
          model_version?: string | null
          region?: string | null
          resource_type?: string | null
          secret_refs?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          api_path?: string | null
          api_version?: string | null
          apim_base_url?: string | null
          apim_route?: string | null
          auth_type?: string | null
          azure_project_name?: string | null
          azure_resource_name?: string | null
          capabilities?: string[]
          connection_config?: Json
          context_type?: string
          created_at?: string
          created_by?: string | null
          default_temperature?: number | null
          deployment_name?: string | null
          description?: string | null
          display_name?: string
          endpoint_url?: string | null
          foundry_resource_name?: string | null
          id?: string
          integration_key?: string
          is_chat_completion?: boolean
          is_enabled?: boolean
          is_production?: boolean
          is_realtime?: boolean
          last_checked_at?: string | null
          last_health_message?: string | null
          last_health_status?: string | null
          max_tokens?: number | null
          model_id?: string | null
          model_version?: string | null
          region?: string | null
          resource_type?: string | null
          secret_refs?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          session_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contracts: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json | null
          parties: Json
          template: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          metadata?: Json | null
          parties?: Json
          template: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          parties?: Json
          template?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_daftra_integrations: {
        Row: {
          account_identifier: string | null
          auth_type: string
          base_url: string | null
          created_at: string
          created_by: string | null
          display_name: string
          endpoint_map: Json
          id: string
          integration_key: string
          is_enabled: boolean
          last_health_message: string | null
          last_health_status: string
          last_sync_at: string | null
          secret_refs: Json
          sync_config: Json
          tenant_name: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_identifier?: string | null
          auth_type?: string
          base_url?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string
          endpoint_map?: Json
          id?: string
          integration_key?: string
          is_enabled?: boolean
          last_health_message?: string | null
          last_health_status?: string
          last_sync_at?: string | null
          secret_refs?: Json
          sync_config?: Json
          tenant_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_identifier?: string | null
          auth_type?: string
          base_url?: string | null
          created_at?: string
          created_by?: string | null
          display_name?: string
          endpoint_map?: Json
          id?: string
          integration_key?: string
          is_enabled?: boolean
          last_health_message?: string | null
          last_health_status?: string
          last_sync_at?: string | null
          secret_refs?: Json
          sync_config?: Json
          tenant_name?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      finance_statements: {
        Row: {
          agent_deployment_name: string | null
          agent_model_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          data: Json
          id: string
          log_id: string | null
          narrative_report: string | null
          period_end: string | null
          period_start: string | null
          source: string
          statement_key: string
          statement_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          agent_deployment_name?: string | null
          agent_model_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          data?: Json
          id?: string
          log_id?: string | null
          narrative_report?: string | null
          period_end?: string | null
          period_start?: string | null
          source?: string
          statement_key: string
          statement_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          agent_deployment_name?: string | null
          agent_model_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          data?: Json
          id?: string
          log_id?: string | null
          narrative_report?: string | null
          period_end?: string | null
          period_start?: string | null
          source?: string
          statement_key?: string
          statement_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      finance_transactions: {
        Row: {
          account_code: string | null
          attachments: Json
          category: string | null
          cost_center: string | null
          created_at: string
          created_by: string | null
          currency: string
          daftra_id: string | null
          daftra_payload: Json
          description: string | null
          direction: string
          discount: number
          document_no: string | null
          document_type: string
          due_date: string | null
          id: string
          paid_amount: number
          party_name: string | null
          party_type: string | null
          project_ref: string | null
          source: string
          status: string
          subtotal: number
          tax: number
          total: number | null
          tx_date: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          account_code?: string | null
          attachments?: Json
          category?: string | null
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          daftra_id?: string | null
          daftra_payload?: Json
          description?: string | null
          direction: string
          discount?: number
          document_no?: string | null
          document_type?: string
          due_date?: string | null
          id?: string
          paid_amount?: number
          party_name?: string | null
          party_type?: string | null
          project_ref?: string | null
          source?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number | null
          tx_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          account_code?: string | null
          attachments?: Json
          category?: string | null
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          daftra_id?: string | null
          daftra_payload?: Json
          description?: string | null
          direction?: string
          discount?: number
          document_no?: string | null
          document_type?: string
          due_date?: string | null
          id?: string
          paid_amount?: number
          party_name?: string | null
          party_type?: string | null
          project_ref?: string | null
          source?: string
          status?: string
          subtotal?: number
          tax?: number
          total?: number | null
          tx_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string
          currency: string | null
          customer_name: string | null
          id: string
          items: Json
          session_id: string | null
          specs: Json
          status: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
          unit_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          customer_name?: string | null
          id?: string
          items?: Json
          session_id?: string | null
          specs?: Json
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          unit_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          customer_name?: string | null
          id?: string
          items?: Json
          session_id?: string | null
          specs?: Json
          status?: string | null
          subtotal?: number | null
          tax?: number | null
          total?: number | null
          unit_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          payload: Json
          source: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          source: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          source?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      supcloud_keepalive: {
        Row: {
          id: number
          marker: string
        }
        Insert: {
          id: number
          marker?: string
        }
        Update: {
          id?: number
          marker?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: string
          project_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          ai_analysis: string | null
          ai_summary: string | null
          created_at: string
          extracted_data: Json | null
          from_name: string | null
          from_number: string
          id: string
          media_filename: string | null
          media_id: string | null
          media_mime_type: string | null
          media_size: number | null
          media_url: string | null
          message_type: string
          processed_at: string | null
          status: string
          text_content: string | null
          wa_message_id: string | null
        }
        Insert: {
          ai_analysis?: string | null
          ai_summary?: string | null
          created_at?: string
          extracted_data?: Json | null
          from_name?: string | null
          from_number: string
          id?: string
          media_filename?: string | null
          media_id?: string | null
          media_mime_type?: string | null
          media_size?: number | null
          media_url?: string | null
          message_type?: string
          processed_at?: string | null
          status?: string
          text_content?: string | null
          wa_message_id?: string | null
        }
        Update: {
          ai_analysis?: string | null
          ai_summary?: string | null
          created_at?: string
          extracted_data?: Json | null
          from_name?: string | null
          from_number?: string
          id?: string
          media_filename?: string | null
          media_id?: string | null
          media_mime_type?: string | null
          media_size?: number | null
          media_url?: string | null
          message_type?: string
          processed_at?: string | null
          status?: string
          text_content?: string | null
          wa_message_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
