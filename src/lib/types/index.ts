export * from './schemas';

export interface Product {
	id: string;
	name: string;
	sku: string;
	category_id: string;
	price: number;
	cost: number | null;
	image_url: string | null;
	active: boolean;
	description: string | null;
	supplier_id: string | null;
	created_at: string;
	updated_at: string;
}

export interface ProductBatch {
	id: string;
	product_id: string;
	batch_number: string | null;
	expiration_date: string | null;
	purchase_cost: number | null;
	quantity_on_hand: number;
}

export interface Category {
	id: string;
	name: string;
	description: string | null;
}

export interface Discount {
	id: string;
	name: string;
	description: string | null;
	amount: number;
	is_percentage: boolean;
	product_ids: string[] | null; // null means it applies to the whole cart
	category_ids: string[] | null;
	minimum_purchase_amount: number | null;
	start_date: string;
	end_date: string | null;
	active: boolean;
}

export interface Modifier {
	id: string;
	name: string;
	description: string | null;
	price_change: number;
	product_ids: string[]; // Specific products this modifier can apply to
}

export interface CartItem {
	product: Product;
	batch: ProductBatch;
	quantity: number;
	modifiers: Modifier[];
	discounts: Discount[];
	base_price: number; // price of product at time of adding
	final_price: number; // price after discounts/modifiers
}

export interface User {
	id: string;
	name: string;
	role: 'admin' | 'manager' | 'cashier';
	pin: string; // Hashed pin
}


