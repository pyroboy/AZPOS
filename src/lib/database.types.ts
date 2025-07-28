
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]


  // Define a default schema name, often 'public' in Supabase
const schema = 'pos';
export type SchemaName = typeof schema;


export type Database = {
  [schema]: {
    Tables: {
      // Based on productSchema, categorySchema, supplierSchema
      products: {
        Row: {
          id: string // Relaxed from uuid() to handle non-compliant data
          name: string // min(2)
          sku: string // min(3)
          description: string | null
          category_id: string // min(1)
          price: number // positive
          base_unit: string
          reorder_point: number | null
          supplier_id: string | null
          aisle: string | null
          is_archived: boolean
          created_at: string // ISO
          updated_at: string // ISO
          image_url: string | null
        }
        Insert: {
          id: string
          name: string
          sku: string
          description?: string | null
          category_id: string
          price: number
          base_unit: string
          reorder_point?: number | null
          supplier_id?: string | null
          aisle?: string | null
          is_archived?: boolean
          created_at?: string // ISO
          updated_at?: string // ISO
          image_url?: string | null
        }
        Update: {
          id?: string
          name?: string
          sku?: string
          description?: string | null
          category_id?: string
          price?: number
          base_unit?: string
          reorder_point?: number | null
          supplier_id?: string | null
          aisle?: string | null
          is_archived?: boolean
          created_at?: string // ISO
          updated_at?: string // ISO
          image_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_category"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_supplier"
            columns: ["supplier_id"]
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          }
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string // ISO
          updated_at: string // ISO
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          id: string
          name: string // min(2)
          contact_person: string | null
          email: string | null // email format
          phone: string | null
          address: string | null
          tin: string | null
          payment_terms: string | null
          is_active: boolean
          created_at: string // ISO
          updated_at: string // ISO
        }
        Insert: {
          id: string
          name: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          tin?: string | null
          payment_terms?: string | null
          is_active?: boolean
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Update: {
          id?: string
          name?: string
          contact_person?: string | null
          email?: string | null
          phone?: string | null
          address?: string | null
          tin?: string | null
          payment_terms?: string | null
          is_active?: boolean
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Relationships: []
      }
      
      // Based on productBatchSchema
      product_batches: {
        Row: {
          id: string
          product_id: string
          batch_number: string
          quantity_on_hand: number // int, non-negative
          purchase_cost: number // positive
          expiration_date: string | null // date
          created_at: string // ISO
          updated_at: string // ISO
        }
        Insert: {
          id: string
          product_id: string
          batch_number: string
          quantity_on_hand: number
          purchase_cost: number
          expiration_date?: string | null
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Update: {
          id?: string
          product_id?: string
          batch_number?: string
          quantity_on_hand?: number
          purchase_cost?: number
          expiration_date?: string | null
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_batch"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      
      // Based on modifierGroupSchema, modifierSchema, productModifierSchema
      modifier_groups: {
        Row: {
          id: string
          name: string
          selection_type: 'single' | 'multiple'
          min_selections: number | null // int, non-negative
          max_selections: number | null // int, non-negative
          is_active: boolean
          created_at: string // ISO
          updated_at: string // ISO
        }
        Insert: {
          id: string
          name: string
          selection_type: 'single' | 'multiple'
          min_selections?: number | null
          max_selections?: number | null
          is_active?: boolean
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Update: {
          id?: string
          name?: string
          selection_type?: 'single' | 'multiple'
          min_selections?: number | null
          max_selections?: number | null
          is_active?: boolean
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Relationships: []
      }
      modifiers: {
        Row: {
          id: string
          name: string
          price_adjustment: number // can be negative
          is_active: boolean
          created_at: string // ISO
          updated_at: string // ISO
        }
        Insert: {
          id: string
          name: string
          price_adjustment?: number
          is_active?: boolean
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Update: {
          id?: string
          name?: string
          price_adjustment?: number
          is_active?: boolean
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Relationships: []
      }
      product_modifiers: {
        Row: {
          id: string
          product_id: string
          modifier_group_id: string
          is_required: boolean
          created_at: string // ISO
        }
        Insert: {
          id: string
          product_id: string
          modifier_group_id: string
          is_required?: boolean
          created_at?: string // ISO
        }
        Update: {
          id?: string
          product_id?: string
          modifier_group_id?: string
          is_required?: boolean
          created_at?: string // ISO
        }
        Relationships: [
          {
            foreignKeyName: "fk_pm_product"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_pm_mod_group"
            columns: ["modifier_group_id"]
            referencedRelation: "modifier_groups"
            referencedColumns: ["id"]
          }
        ]
      }

      // Based on purchaseOrderSchema, purchaseOrderItemSchema
      purchase_orders: {
        Row: {
          id: string
          supplier_id: string
          order_date: string // date
          expected_date: string | null // date
          status: 'draft' | 'pending' | 'received' | 'partially_received' | 'cancelled'
          notes: string | null
          created_at: string // ISO
          updated_at: string // ISO
          total_amount: number | null
        }
        Insert: {
          id: string
          supplier_id: string
          order_date: string // date
          expected_date?: string | null
          status?: 'draft' | 'pending' | 'received' | 'partially_received' | 'cancelled'
          notes?: string | null
          created_at?: string // ISO
          updated_at?: string // ISO
          total_amount?: number | null
        }
        Update: {
          id?: string
          supplier_id?: string
          order_date?: string // date
          expected_date?: string | null
          status?: 'draft' | 'pending' | 'received' | 'partially_received' | 'cancelled'
          notes?: string | null
          created_at?: string // ISO
          updated_at?: string // ISO
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_po_supplier"
            columns: ["supplier_id"]
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          }
        ]
      }
      purchase_order_items: {
        Row: {
          id: string
          po_id: string
          product_id: string
          quantity_ordered: number // int, positive
          quantity_received: number | null // int, non-negative
          purchase_cost: number // positive
          created_at: string // ISO
          updated_at: string // ISO
        }
        Insert: {
          id: string
          po_id: string
          product_id: string
          quantity_ordered: number
          quantity_received?: number | null
          purchase_cost: number
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Update: {
          id?: string
          po_id?: string
          product_id?: string
          quantity_ordered?: number
          quantity_received?: number | null
          purchase_cost?: number
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Relationships: [
          {
            foreignKeyName: "fk_poi_po"
            columns: ["po_id"]
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_poi_product"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      
      // Based on inventoryAdjustmentSchema
      inventory_adjustments: {
        Row: {
          id: string
          product_id: string
          batch_id: string | null
          quantity_change: number // int (can be negative)
          adjustment_type: 'add' | 'remove' | 'set'
          reason: 'cycle_count' | 'spoilage' | 'damage' | 'theft' | 'correction' | 'other' | 'incoming' | 'outgoing'
          notes: string | null
          created_at: string // ISO
          user_id: string
        }
        Insert: {
          id: string
          product_id: string
          batch_id?: string | null
          quantity_change: number
          adjustment_type: 'add' | 'remove' | 'set'
          reason: 'cycle_count' | 'spoilage' | 'damage' | 'theft' | 'correction' | 'other' | 'incoming' | 'outgoing'
          notes?: string | null
          created_at?: string // ISO
          user_id: string
        }
        Update: {
          id?: string
          product_id?: string
          batch_id?: string | null
          quantity_change?: number
          adjustment_type?: 'add' | 'remove' | 'set'
          reason?: 'cycle_count' | 'spoilage' | 'damage' | 'theft' | 'correction' | 'other' | 'incoming' | 'outgoing'
          notes?: string | null
          created_at?: string // ISO
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_ia_product"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ia_batch"
            columns: ["batch_id"]
            referencedRelation: "product_batches"
            referencedColumns: ["id"]
          }
          // user_id relationship would depend on users table structure
        ]
      }
      
      // Based on transactionSchema, transactionItemSchema
      transactions: {
        Row: {
          id: string
          total_amount: number
          tax_amount: number | null
          discount_amount: number | null
          payment_method: 'cash' | 'gcash' // Simplified from original
          status: 'completed' | 'voided' | 'pending'
          notes: string | null
          created_at: string // ISO
          user_id: string
          customer_name: string | null
          cash_tendered: number | null
          gcash_reference: string | null
        }
        Insert: {
          id: string
          total_amount: number
          tax_amount?: number | null
          discount_amount?: number | null
          payment_method: 'cash' | 'gcash'
          status?: 'completed' | 'voided' | 'pending'
          notes?: string | null
          created_at?: string // ISO
          user_id: string
          customer_name?: string | null
          cash_tendered?: number | null
          gcash_reference?: string | null
        }
        Update: {
          id?: string
          total_amount?: number
          tax_amount?: number | null
          discount_amount?: number | null
          payment_method?: 'cash' | 'gcash'
          status?: 'completed' | 'voided' | 'pending'
          notes?: string | null
          created_at?: string // ISO
          user_id?: string
          customer_name?: string | null
          cash_tendered?: number | null
          gcash_reference?: string | null
        }
        Relationships: [
          // user_id relationship would depend on users table structure
        ]
      }
      transaction_items: {
        Row: {
          id: string
          transaction_id: string
          product_id: string
          batch_id: string | null
          quantity: number // int, positive
          unit_price: number // positive
          total_price: number
          created_at: string // ISO
        }
        Insert: {
          id: string
          transaction_id: string
          product_id: string
          batch_id?: string | null
          quantity: number
          unit_price: number
          total_price: number
          created_at?: string // ISO
        }
        Update: {
          id?: string
          transaction_id?: string
          product_id?: string
          batch_id?: string | null
          quantity?: number
          unit_price?: number
          total_price?: number
          created_at?: string // ISO
        }
        Relationships: [
          {
            foreignKeyName: "fk_ti_transaction"
            columns: ["transaction_id"]
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ti_product"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ti_batch"
            columns: ["batch_id"]
            referencedRelation: "product_batches"
            referencedColumns: ["id"]
          }
        ]
      }
      
      // Based on returnSchema, returnItemSchema
      returns: {
        Row: {
          id: string
          original_transaction_id: string | null
          reason: string // min(3)
          status: 'pending' | 'approved' | 'rejected'
          notes: string | null
          created_at: string // ISO
          processed_at: string | null // ISO
          user_id: string
        }
        Insert: {
          id: string
          original_transaction_id?: string | null
          reason: string
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          created_at?: string // ISO
          processed_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          original_transaction_id?: string | null
          reason?: string
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          created_at?: string // ISO
          processed_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_return_transaction"
            columns: ["original_transaction_id"]
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          }
          // user_id relationship would depend on users table structure
        ]
      }
      return_items: {
        Row: {
          id: string
          return_id: string
          product_id: string
          batch_id: string | null
          quantity_returned: number // int, positive
          refund_amount: number
          condition: 'new' | 'used' | 'damaged'
          created_at: string // ISO
        }
        Insert: {
          id: string
          return_id: string
          product_id: string
          batch_id?: string | null
          quantity_returned: number
          refund_amount: number
          condition: 'new' | 'used' | 'damaged'
          created_at?: string // ISO
        }
        Update: {
          id?: string
          return_id?: string
          product_id?: string
          batch_id?: string | null
          quantity_returned?: number
          refund_amount?: number
          condition?: 'new' | 'used' | 'damaged'
          created_at?: string // ISO
        }
        Relationships: [
          {
            foreignKeyName: "fk_ri_return"
            columns: ["return_id"]
            referencedRelation: "returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ri_product"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_ri_batch"
            columns: ["batch_id"]
            referencedRelation: "product_batches"
            referencedColumns: ["id"]
          }
        ]
      }
      
      // Based on discountSchema
      discounts: {
        Row: {
          id: string
          name: string // min(2)
          type: 'percentage' | 'fixed_amount'
          value: number // non-negative
          is_active: boolean
          applicable_scope: 'all_items' | 'specific_category' | 'specific_product'
          category_id: string | null
          product_id: string | null
          start_date: string | null // ISO
          end_date: string | null // ISO
          usage_limit: number | null // int, positive
          times_used: number | null // int, non-negative
          created_at: string // ISO
          updated_at: string // ISO
        }
        Insert: {
          id: string
          name: string
          type: 'percentage' | 'fixed_amount'
          value: number
          is_active?: boolean
          applicable_scope?: 'all_items' | 'specific_category' | 'specific_product'
          category_id?: string | null
          product_id?: string | null
          start_date?: string | null
          end_date?: string | null
          usage_limit?: number | null
          times_used?: number | null
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Update: {
          id?: string
          name?: string
          type?: 'percentage' | 'fixed_amount'
          value?: number
          is_active?: boolean
          applicable_scope?: 'all_items' | 'specific_category' | 'specific_product'
          category_id?: string | null
          product_id?: string | null
          start_date?: string | null
          end_date?: string | null
          usage_limit?: number | null
          times_used?: number | null
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Relationships: [
          {
            foreignKeyName: "fk_discount_category"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_discount_product"
            columns: ["product_id"]
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      
      // Based on userStore.ts and sessionStore.ts (simplified)
      users: {
        Row: {
          id: string
          full_name: string
          username: string
          role: 'admin' | 'owner' | 'manager' | 'cashier' | 'staff'
          pin_hash: string
          is_active: boolean
          created_at: string // ISO
          updated_at: string // ISO
        }
        Insert: {
          id: string
          full_name: string
          username: string
          role: 'admin' | 'owner' | 'manager' | 'cashier' | 'staff'
          pin_hash: string
          is_active?: boolean
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Update: {
          id?: string
          full_name?: string
          username?: string
          role?: 'admin' | 'owner' | 'manager' | 'cashier' | 'staff'
          pin_hash?: string
          is_active?: boolean
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Relationships: []
      }
      
      // Based on settingsSchema (simplified into a single row table concept)
      settings: {
        Row: {
          id: string // Primary key, likely 'default' or similar
          store_name: string // min(1)
          address: string // min(1)
          tin: string | null
          currency: string // min(1)
          timezone: string | null
          language: string | null
          created_at: string // ISO
          updated_at: string // ISO
        }
        Insert: {
          id?: string
          store_name: string
          address: string
          tin?: string | null
          currency: string
          timezone?: string | null
          language?: string | null
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Update: {
          id?: string
          store_name?: string
          address?: string
          tin?: string | null
          currency?: string
          timezone?: string | null
          language?: string | null
          created_at?: string // ISO
          updated_at?: string // ISO
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      // From modifierGroupSchema
      modifier_group_selection_type: "single" | "multiple"
      // From purchaseOrderSchema
      purchase_order_status: "draft" | "pending" | "received" | "partially_received" | "cancelled"
      // From inventoryAdjustmentSchema
      inventory_adjustment_type: "add" | "remove" | "set"
      inventory_adjustment_reason: "cycle_count" | "spoilage" | "damage" | "theft" | "correction" | "other" | "incoming" | "outgoing"
      // From transactionSchema
      transaction_payment_method: "cash" | "gcash" // Simplified
      transaction_status: "completed" | "voided" | "pending"
      // From returnSchema
      return_status: "pending" | "approved" | "rejected"
      return_item_condition: "new" | "used" | "damaged"
      // From discountSchema
      discount_type: "percentage" | "fixed_amount"
      discount_scope: "all_items" | "specific_category" | "specific_product"
      // From userStore.ts / models.ts
      user_role: "admin" | "owner" | "manager" | "cashier" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Schema = Database[typeof schema]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["pos"]["Tables"] & Database["pos"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["pos"]["Tables"] &
      Database["pos"]["Views"])
  ? (Database["pos"]["Tables"] &
      Database["pos"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["pos"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["pos"]["Tables"]
  ? Database["pos"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["pos"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["pos"]["Tables"]
  ? Database["pos"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["pos"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["pos"]["Enums"]
  ? Database["pos"]["Enums"][PublicEnumNameOrOptions]
  : never