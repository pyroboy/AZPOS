## Entry: store-schema-design

**Timestamp:** 2025-07-28T09:59:08+08:00
**Task ID:** store-api-design
**Type:** Final Design

### Content

---

# Customer-Facing Data Schema and API Contracts for /store Route

## Executive Summary

This document defines the customer-facing data schema and API contracts for the AZPOS /store route, incorporating security best practices from the research findings and leveraging existing Zod schemas. The design prioritizes data security, performance, and user experience while maintaining compatibility with the existing system architecture.

## Security Considerations

Based on the security research findings, the following principles are incorporated:

1. **Server-Side Validation**: All API endpoints use server-side validation with SvelteKit form actions
2. **Data Sanitization**: Customer-facing data excludes sensitive internal fields
3. **Rate Limiting**: API endpoints implement rate limiting to prevent abuse
4. **Input Validation**: All inputs are validated using Zod schemas
5. **Session Management**: Secure session handling for customer authentication (if implemented)

## Customer-Facing Data Types

### 1. Customer Product Schema

```typescript
// Customer-facing product schema - sanitized version of internal Product
export const CustomerProductSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	sku: z.string(),
	description: z.string().optional(),
	category_id: z.string().uuid(),
	category_name: z.string(), // Denormalized for performance
	price: z.number().positive(),
	image_url: z.string().url().optional(),
	base_unit: z.enum(['piece', 'gram', 'kg', 'ml', 'L', 'pack', 'can', 'bottle']),
	in_stock: z.boolean(),
	stock_level: z.enum(['high', 'medium', 'low', 'out_of_stock']), // Abstracted stock info
	product_type: z.enum(['standard', 'variant', 'bundle']),
	bundle_components: z
		.array(
			z.object({
				product_id: z.string().uuid(),
				product_name: z.string(),
				quantity: z.number().positive()
			})
		)
		.optional(),
	available_modifiers: z
		.array(
			z.object({
				group_id: z.string().uuid(),
				group_name: z.string(),
				selection_type: z.enum(['single', 'multiple']),
				options: z.array(
					z.object({
						id: z.string().uuid(),
						name: z.string(),
						price_adjustment: z.number()
					})
				)
			})
		)
		.optional()
	// Excluded: supplier info, cost data, internal inventory details
});

export type CustomerProduct = z.infer<typeof CustomerProductSchema>;
```

### 2. Enhanced Cart Item Schema

```typescript
// Enhanced cart item schema with validation and security
export const CustomerCartItemSchema = z.object({
	cart_item_id: z.string().uuid(),
	product_id: z.string().uuid(),
	product_name: z.string(),
	product_sku: z.string(),
	base_price: z.number().positive(),
	quantity: z.number().int().positive().max(999), // Prevent excessive quantities
	selected_modifiers: z
		.array(
			z.object({
				modifier_id: z.string().uuid(),
				modifier_name: z.string(),
				price_adjustment: z.number()
			})
		)
		.optional(),
	applied_discounts: z
		.array(
			z.object({
				discount_id: z.string().uuid(),
				discount_name: z.string(),
				discount_amount: z.number().nonnegative()
			})
		)
		.optional(),
	subtotal: z.number().nonnegative(),
	final_price: z.number().nonnegative(),
	image_url: z.string().url().optional(),
	added_at: z.string().datetime(),
	updated_at: z.string().datetime(),
	// Validation constraints
	notes: z.string().max(500).optional() // Limit note length
});

export type CustomerCartItem = z.infer<typeof CustomerCartItemSchema>;
```

### 3. Customer Transaction Schema

```typescript
// Customer-facing transaction schema - limited sensitive data exposure
export const CustomerTransactionSchema = z.object({
	id: z.string().uuid(),
	transaction_number: z.string(), // Human-readable transaction ID
	status: z.enum(['completed', 'pending', 'cancelled']),
	subtotal: z.number().nonnegative(),
	tax_amount: z.number().nonnegative(),
	discount_amount: z.number().nonnegative(),
	total_amount: z.number().nonnegative(),
	created_at: z.string().datetime(),
	items: z.array(
		z.object({
			product_id: z.string().uuid(),
			product_name: z.string(),
			product_sku: z.string(),
			quantity: z.number().int().positive(),
			unit_price: z.number().positive(),
			subtotal: z.number().nonnegative(),
			applied_discounts: z
				.array(
					z.object({
						name: z.string(),
						amount: z.number().nonnegative()
					})
				)
				.optional()
		})
	),
	payment_summary: z.object({
		payment_method: z.enum(['cash', 'credit_card', 'debit_card', 'other']),
		amount_paid: z.number().positive(),
		change_given: z.number().nonnegative().optional()
	})
	// Excluded: internal user_id, detailed payment references, system metadata
});

export type CustomerTransaction = z.infer<typeof CustomerTransactionSchema>;
```

### 4. Customer Discount Schema

```typescript
// Customer-facing discount schema - public discount information
export const CustomerDiscountSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	description: z.string().optional(),
	type: z.enum(['percentage', 'fixed_amount']),
	display_value: z.string(), // e.g., "20% OFF" or "$5 OFF"
	applicable_scope: z.enum(['all_items', 'specific_product', 'specific_category']),
	applicable_products: z
		.array(
			z.object({
				product_id: z.string().uuid(),
				product_name: z.string()
			})
		)
		.optional(),
	applicable_categories: z
		.array(
			z.object({
				category_id: z.string().uuid(),
				category_name: z.string()
			})
		)
		.optional(),
	minimum_purchase: z.number().nonnegative().optional(),
	maximum_discount: z.number().positive().optional(),
	valid_until: z.string().datetime().optional(),
	terms_and_conditions: z.string().optional()
	// Excluded: internal value calculations, admin flags
});

export type CustomerDiscount = z.infer<typeof CustomerDiscountSchema>;
```

## API Contracts for /store Route

### 1. Product Catalog API

```typescript
// GET /store/api/products
export const ProductCatalogRequestSchema = z.object({
	category_id: z.string().uuid().optional(),
	search: z.string().max(100).optional(),
	page: z.number().int().positive().default(1),
	limit: z.number().int().positive().max(50).default(20),
	sort_by: z.enum(['name', 'price', 'popularity']).default('name'),
	sort_order: z.enum(['asc', 'desc']).default('asc'),
	in_stock_only: z.boolean().default(true)
});

export const ProductCatalogResponseSchema = z.object({
	products: z.array(CustomerProductSchema),
	pagination: z.object({
		current_page: z.number().int().positive(),
		total_pages: z.number().int().nonnegative(),
		total_items: z.number().int().nonnegative(),
		items_per_page: z.number().int().positive()
	}),
	categories: z.array(
		z.object({
			id: z.string().uuid(),
			name: z.string(),
			product_count: z.number().int().nonnegative()
		})
	)
});
```

### 2. Cart Management API

```typescript
// POST /store/api/cart/add
export const AddToCartRequestSchema = z.object({
	product_id: z.string().uuid(),
	quantity: z.number().int().positive().max(999),
	selected_modifiers: z.array(z.string().uuid()).optional(),
	notes: z.string().max(500).optional()
});

export const AddToCartResponseSchema = z.object({
	success: z.boolean(),
	cart_item: CustomerCartItemSchema.optional(),
	cart_summary: z.object({
		total_items: z.number().int().nonnegative(),
		subtotal: z.number().nonnegative()
	}),
	message: z.string().optional()
});

// PUT /store/api/cart/update
export const UpdateCartItemRequestSchema = z.object({
	cart_item_id: z.string().uuid(),
	quantity: z.number().int().positive().max(999),
	selected_modifiers: z.array(z.string().uuid()).optional()
});

// DELETE /store/api/cart/remove
export const RemoveFromCartRequestSchema = z.object({
	cart_item_id: z.string().uuid()
});

// GET /store/api/cart
export const CartResponseSchema = z.object({
	items: z.array(CustomerCartItemSchema),
	summary: z.object({
		subtotal: z.number().nonnegative(),
		tax_amount: z.number().nonnegative(),
		discount_amount: z.number().nonnegative(),
		total_amount: z.number().nonnegative(),
		total_items: z.number().int().nonnegative()
	}),
	available_discounts: z.array(CustomerDiscountSchema)
});
```

### 3. Checkout API

```typescript
// POST /store/api/checkout
export const CheckoutRequestSchema = z.object({
	payment_method: z.enum(['cash', 'credit_card', 'debit_card']),
	applied_discounts: z.array(z.string().uuid()).optional(),
	customer_info: z
		.object({
			name: z.string().min(2).max(100).optional(),
			email: z.string().email().optional(),
			phone: z.string().max(20).optional()
		})
		.optional(),
	special_instructions: z.string().max(500).optional()
});

export const CheckoutResponseSchema = z.object({
	success: z.boolean(),
	transaction: CustomerTransactionSchema.optional(),
	receipt_url: z.string().url().optional(),
	message: z.string(),
	errors: z
		.array(
			z.object({
				field: z.string(),
				message: z.string()
			})
		)
		.optional()
});
```

### 4. Order History API

```typescript
// GET /store/api/orders (requires customer session)
export const OrderHistoryRequestSchema = z.object({
	page: z.number().int().positive().default(1),
	limit: z.number().int().positive().max(20).default(10),
	date_from: z.string().datetime().optional(),
	date_to: z.string().datetime().optional()
});

export const OrderHistoryResponseSchema = z.object({
	orders: z.array(CustomerTransactionSchema),
	pagination: z.object({
		current_page: z.number().int().positive(),
		total_pages: z.number().int().nonnegative(),
		total_orders: z.number().int().nonnegative()
	})
});
```

## Security Implementation Guidelines

### 1. Server-Side Validation

```typescript
// Example SvelteKit form action with security
export const actions = {
	addToCart: async ({ request, locals, getClientAddress }) => {
		// Rate limiting check
		const clientIp = getClientAddress();
		if (!(await checkRateLimit(clientIp, 'add_to_cart', 10, 60))) {
			return fail(429, { error: 'Too many requests' });
		}

		const data = await request.formData();
		const parsed = AddToCartRequestSchema.safeParse({
			product_id: data.get('product_id'),
			quantity: Number(data.get('quantity')),
			selected_modifiers: JSON.parse(data.get('selected_modifiers') || '[]')
		});

		if (!parsed.success) {
			return fail(400, {
				error: 'Invalid input',
				details: parsed.error.flatten()
			});
		}

		// Business logic with additional validation
		const result = await addToCartSecure(parsed.data, locals.session);
		return result;
	}
};
```

### 2. Data Sanitization

```typescript
// Utility function to sanitize product data for customer view
export function sanitizeProductForCustomer(product: Product): CustomerProduct {
	return {
		id: product.id,
		name: product.name,
		sku: product.sku,
		description: product.description,
		category_id: product.category_id,
		category_name: product.category_name, // From join
		price: product.price,
		image_url: product.image_url,
		base_unit: product.base_unit,
		in_stock: product.stock > 0,
		stock_level: getStockLevel(product.stock, product.reorder_point),
		product_type: product.product_type,
		bundle_components: product.bundle_components?.map((comp) => ({
			product_id: comp.product_id,
			product_name: comp.product_name, // From join
			quantity: comp.quantity
		})),
		available_modifiers: product.available_modifiers
		// Excluded: supplier_id, average_cost, reorder_point, etc.
	};
}
```

### 3. Input Validation Middleware

```typescript
// Middleware for consistent input validation
export function validateInput<T>(schema: z.ZodSchema<T>) {
	return (handler: (data: T, event: RequestEvent) => Promise<Response>) => {
		return async (event: RequestEvent) => {
			const formData = await event.request.formData();
			const data = Object.fromEntries(formData.entries());

			const parsed = schema.safeParse(data);
			if (!parsed.success) {
				return new Response(
					JSON.stringify({
						error: 'Validation failed',
						details: parsed.error.flatten()
					}),
					{ status: 400, headers: { 'Content-Type': 'application/json' } }
				);
			}

			return handler(parsed.data, event);
		};
	};
}
```

## Performance Considerations

1. **Pagination**: All list endpoints implement pagination with reasonable limits
2. **Caching**: Product catalog and category data should be cached
3. **Denormalization**: Category names and other frequently accessed data are denormalized
4. **Lazy Loading**: Product images and detailed information loaded on demand
5. **Rate Limiting**: Prevents abuse and ensures fair resource usage

## Integration with Existing System

1. **Zod Schema Compatibility**: All schemas extend existing internal schemas
2. **Type Safety**: Full TypeScript support with inferred types
3. **SvelteKit Integration**: Designed for SvelteKit form actions and API routes
4. **Database Compatibility**: Works with existing database schema
5. **Role-Based Access**: Integrates with existing user role system for admin functions

## Implementation Roadmap

### Phase 1: Core API (Week 1)

- Product catalog API
- Basic cart management
- Input validation middleware

### Phase 2: Enhanced Features (Week 2)

- Discount system integration
- Checkout process
- Order history

### Phase 3: Security & Performance (Week 3)

- Rate limiting implementation
- Caching layer
- Security audit and testing

### Phase 4: Customer Features (Week 4)

- Customer accounts (optional)
- Order tracking
- Receipt generation

---

**Implementation Notes:**

- All schemas are designed to be backward compatible with existing internal schemas
- Security principles from agent_researcher findings are incorporated throughout
- API design follows RESTful principles with SvelteKit-specific optimizations
- Customer data privacy is prioritized by excluding sensitive internal information
