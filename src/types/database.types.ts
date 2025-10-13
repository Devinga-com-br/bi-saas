export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          cnpj: string | null
          phone: string | null
          supabase_schema: string | null
          tenant_type: 'company' | 'branch'
          parent_tenant_id: string | null
          settings: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          cnpj?: string | null
          phone?: string | null
          supabase_schema?: string | null
          tenant_type?: 'company' | 'branch'
          parent_tenant_id?: string | null
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          cnpj?: string | null
          phone?: string | null
          supabase_schema?: string | null
          tenant_type?: 'company' | 'branch'
          parent_tenant_id?: string | null
          settings?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          tenant_id: string | null
          full_name: string
          avatar_url: string | null
          role: 'superadmin' | 'admin' | 'user' | 'viewer'
          can_switch_tenants: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          tenant_id?: string | null
          full_name: string
          avatar_url?: string | null
          role?: 'superadmin' | 'admin' | 'user' | 'viewer'
          can_switch_tenants?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string | null
          full_name?: string
          avatar_url?: string | null
          role?: 'superadmin' | 'admin' | 'user' | 'viewer'
          can_switch_tenants?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_tenant_access: {
        Row: {
          id: string
          user_id: string
          tenant_id: string
          granted_at: string
          granted_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id: string
          granted_at?: string
          granted_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string
          granted_at?: string
          granted_by?: string | null
          created_at?: string
        }
      }
      branches: {
        Row: {
          branch_code: string
          tenant_id: string
          store_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          branch_code: string
          tenant_id: string
          store_code?: string | null
        }
        Update: {
          branch_code?: string
          tenant_id?: string
          store_code?: string | null
        }
      }
    }
  }
}