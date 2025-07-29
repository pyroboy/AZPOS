import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

// Type definitions for JSON columns
export interface DiscountInfo {
	id: string;
	type: 'percentage' | 'fixed_amount' | 'bogo';
	value: number;
	code?: string;
	description?: string;
}

export interface ProductModifier {
	id: string;
	name: string;
	price: number;
	type: 'addon' | 'variant';
	category?: string;
}

// Create Supabase client for server-side operations
export function createSupabaseClient() {
	return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

// Type definitions for database tables
export interface Database {
	public: {
		Tables: {
			carts: {
				Row: {
					id: string;
					user_id: string | null;
					session_id: string | null;
					discount: DiscountInfo | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id?: string | null;
					session_id?: string | null;
					discount?: DiscountInfo | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string | null;
					session_id?: string | null;
					discount?: DiscountInfo | null;
					created_at?: string;
					updated_at?: string;
				};
			};
			cart_items: {
				Row: {
					id: string;
					user_id: string | null;
					session_id: string | null;
					product_id: string;
					quantity: number;
					selected_modifiers: ProductModifier[];
					applied_discounts: DiscountInfo[];
					subtotal: number;
					final_price: number;
					notes: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id?: string | null;
					session_id?: string | null;
					product_id: string;
					quantity: number;
					selected_modifiers?: ProductModifier[];
					applied_discounts?: DiscountInfo[];
					subtotal: number;
					final_price: number;
					notes?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string | null;
					session_id?: string | null;
					product_id?: string;
					quantity?: number;
					selected_modifiers?: ProductModifier[];
					applied_discounts?: DiscountInfo[];
					subtotal?: number;
					final_price?: number;
					notes?: string | null;
					created_at?: string;
					updated_at?: string;
				};
			};
		};
	};
}
