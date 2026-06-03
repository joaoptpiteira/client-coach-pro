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
      fin_categories: {
        Row: {
          cor: string
          created_at: string
          icone: string
          id: string
          nome: string
          ordem: number
          owner_id: string
          tipo: Database["public"]["Enums"]["fin_tipo"]
          updated_at: string
        }
        Insert: {
          cor?: string
          created_at?: string
          icone?: string
          id?: string
          nome: string
          ordem?: number
          owner_id: string
          tipo: Database["public"]["Enums"]["fin_tipo"]
          updated_at?: string
        }
        Update: {
          cor?: string
          created_at?: string
          icone?: string
          id?: string
          nome?: string
          ordem?: number
          owner_id?: string
          tipo?: Database["public"]["Enums"]["fin_tipo"]
          updated_at?: string
        }
        Relationships: []
      }
      fin_fixed_expenses: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          created_at: string
          dia_pagamento: number | null
          id: string
          mes_fim: string | null
          mes_inicio: string | null
          mes_pagamento_anual: number | null
          nome: string
          notas: string | null
          owner_id: string
          tipo_recorrencia: Database["public"]["Enums"]["fin_recorrencia"]
          updated_at: string
          valor_anual: number | null
          valor_mensal: number
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          dia_pagamento?: number | null
          id?: string
          mes_fim?: string | null
          mes_inicio?: string | null
          mes_pagamento_anual?: number | null
          nome: string
          notas?: string | null
          owner_id: string
          tipo_recorrencia?: Database["public"]["Enums"]["fin_recorrencia"]
          updated_at?: string
          valor_anual?: number | null
          valor_mensal?: number
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          created_at?: string
          dia_pagamento?: number | null
          id?: string
          mes_fim?: string | null
          mes_inicio?: string | null
          mes_pagamento_anual?: number | null
          nome?: string
          notas?: string | null
          owner_id?: string
          tipo_recorrencia?: Database["public"]["Enums"]["fin_recorrencia"]
          updated_at?: string
          valor_anual?: number | null
          valor_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_fixed_expenses_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "fin_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_transactions: {
        Row: {
          categoria_id: string | null
          created_at: string
          data: string
          descricao: string | null
          fixed_expense_id: string | null
          id: string
          mes_referencia: string
          notas: string | null
          origem: Database["public"]["Enums"]["fin_origem"]
          owner_id: string
          tipo: Database["public"]["Enums"]["fin_tipo"]
          updated_at: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          fixed_expense_id?: string | null
          id?: string
          mes_referencia: string
          notas?: string | null
          origem?: Database["public"]["Enums"]["fin_origem"]
          owner_id: string
          tipo: Database["public"]["Enums"]["fin_tipo"]
          updated_at?: string
          valor?: number
        }
        Update: {
          categoria_id?: string | null
          created_at?: string
          data?: string
          descricao?: string | null
          fixed_expense_id?: string | null
          id?: string
          mes_referencia?: string
          notas?: string | null
          origem?: Database["public"]["Enums"]["fin_origem"]
          owner_id?: string
          tipo?: Database["public"]["Enums"]["fin_tipo"]
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_transactions_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "fin_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_transactions_fixed_expense_id_fkey"
            columns: ["fixed_expense_id"]
            isOneToOne: false
            referencedRelation: "fin_fixed_expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_clients: {
        Row: {
          ativo: boolean
          created_at: string
          desconto_afiliado: number
          forecast: Database["public"]["Enums"]["pt_forecast"]
          forecast_notas: string | null
          forecast_valor: number | null
          frequencia_semanal: number
          id: string
          indicado_por: string | null
          mes_inicio: string | null
          nome: string
          notas: string | null
          numero: number
          owner_id: string
          service_type: Database["public"]["Enums"]["pt_service_type"]
          status: Database["public"]["Enums"]["pt_client_status"]
          telefone: string | null
          treinos_dados: number
          treinos_pagos: number
          updated_at: string
          valor_acompanhamento_online: number
          valor_acordado: number
          valor_attivo: number
          valor_ginasio: number
          valor_ginasio_por_treino: number
          valor_recebido: number
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          desconto_afiliado?: number
          forecast?: Database["public"]["Enums"]["pt_forecast"]
          forecast_notas?: string | null
          forecast_valor?: number | null
          frequencia_semanal?: number
          id?: string
          indicado_por?: string | null
          mes_inicio?: string | null
          nome: string
          notas?: string | null
          numero: number
          owner_id: string
          service_type?: Database["public"]["Enums"]["pt_service_type"]
          status?: Database["public"]["Enums"]["pt_client_status"]
          telefone?: string | null
          treinos_dados?: number
          treinos_pagos?: number
          updated_at?: string
          valor_acompanhamento_online?: number
          valor_acordado?: number
          valor_attivo?: number
          valor_ginasio?: number
          valor_ginasio_por_treino?: number
          valor_recebido?: number
        }
        Update: {
          ativo?: boolean
          created_at?: string
          desconto_afiliado?: number
          forecast?: Database["public"]["Enums"]["pt_forecast"]
          forecast_notas?: string | null
          forecast_valor?: number | null
          frequencia_semanal?: number
          id?: string
          indicado_por?: string | null
          mes_inicio?: string | null
          nome?: string
          notas?: string | null
          numero?: number
          owner_id?: string
          service_type?: Database["public"]["Enums"]["pt_service_type"]
          status?: Database["public"]["Enums"]["pt_client_status"]
          telefone?: string | null
          treinos_dados?: number
          treinos_pagos?: number
          updated_at?: string
          valor_acompanhamento_online?: number
          valor_acordado?: number
          valor_attivo?: number
          valor_ginasio?: number
          valor_ginasio_por_treino?: number
          valor_recebido?: number
        }
        Relationships: []
      }
      pt_payments: {
        Row: {
          client_id: string
          created_at: string
          data: string
          id: string
          mes_referencia: string
          notas: string | null
          owner_id: string
          updated_at: string
          valor_pago: number
          valor_pt: number
        }
        Insert: {
          client_id: string
          created_at?: string
          data?: string
          id?: string
          mes_referencia: string
          notas?: string | null
          owner_id: string
          updated_at?: string
          valor_pago?: number
          valor_pt?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          data?: string
          id?: string
          mes_referencia?: string
          notas?: string | null
          owner_id?: string
          updated_at?: string
          valor_pago?: number
          valor_pt?: number
        }
        Relationships: [
          {
            foreignKeyName: "pt_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "pt_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      pt_trainings: {
        Row: {
          client_id: string
          created_at: string
          data: string
          id: string
          notas: string | null
          owner_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          data?: string
          id?: string
          notas?: string | null
          owner_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          data?: string
          id?: string
          notas?: string | null
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pt_trainings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "pt_clients"
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
      fin_origem: "manual" | "fixa_gerada" | "pt_payment"
      fin_recorrencia: "mensal" | "anual_provisao"
      fin_tipo: "receita" | "despesa"
      pt_client_status: "ativo" | "antigo" | "prospect"
      pt_forecast: "continuar" | "parar" | "indefinido"
      pt_service_type: "mensalidade" | "pack"
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
      fin_origem: ["manual", "fixa_gerada", "pt_payment"],
      fin_recorrencia: ["mensal", "anual_provisao"],
      fin_tipo: ["receita", "despesa"],
      pt_client_status: ["ativo", "antigo", "prospect"],
      pt_forecast: ["continuar", "parar", "indefinido"],
      pt_service_type: ["mensalidade", "pack"],
    },
  },
} as const
