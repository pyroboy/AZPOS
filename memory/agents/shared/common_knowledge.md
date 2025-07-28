Yes

---

### ✅ **MVP Scope for `/store` – Online Grocery Interface (Codebase-Focused)**

Based on your goal and the provided codebase, we will **extract and refactor only the specifications necessary** to build a **customer-facing online grocery store** at the `/store` route.

We will:

- **Keep** only what is needed for browsing, searching, cart, and checkout.
- **Reuse** existing types, schemas, and stores where possible.
- **Ignore** internal operations (inventory adjustments, POs, returns, admin settings) unless they directly impact the customer experience.
- **Simplify** complex features (e.g., roles, authentication) to a guest + staff-aware model.

---

## 🛒 1. Core Customer Features (MVP Scope)

| Feature                 | Source of Truth                                 | Status      |
| ----------------------- | ----------------------------------------------- | ----------- |
| **Product Catalog**     | `productSchema`, `products` store               | ✅ Reuse    |
| **Search & Filter**     | `$searchTerm`, `categories`, `filteredProducts` | ✅ Reuse    |
| **Product Detail View** | `ProductEntry.svelte`, `productSchema`          | ✅ Reuse    |
| **Add to Cart**         | `cartStore`, `CartItem`, `finalizedCart`        | ✅ Reuse    |
| **Cart Management**     | `cartStore.add()`, `update()`, `remove()`       | ✅ Reuse    |
| **Checkout Flow**       | `Transaction`, `paymentMethod`, `customerName`  | ✅ Refactor |
| **Order Confirmation**  | `transactionId`, `timestamp`                    | ✅ Reuse    |
| **Guest Checkout**      | No login required                               | ✅ Enforce  |
| **Stock Awareness**     | `quantity_on_hand`, `stock` field               | ✅ Reuse    |
| **Image Display**       | `sanitizeImageUrl`, `ImageWithFallback`         | ✅ Reuse    |

---

## 🧱 2. Data Contracts (Customer-Facing)

### `Product` (from `productSchema`)

```ts
{
  id: string;
  sku: string;
  name: string;
  description?: string;
  category_id: string;
  price: number;
  image_url?: string;
  aisle?: string;
  reorder_point?: number;
  is_archived: boolean;
  stock: number; // derived from batches or direct field
  requires_batch_tracking: boolean;
}
```

- **Used By**: `/store`, `ProductCard`, `ProductDetail`
- **Critique**: Strong. Already includes stock and category.

---

### `Category` (from `categorySchema`)

```ts
{
  id: string;
  name: string;
  description?: string;
}
```

- **Used By**: Filter chips in `/store`
- **Critique**: Good. Simple and clear.

---

### `CartItem`

```ts
{
	product_id: string;
	product_name: string;
	product_sku: string;
	price: number;
	quantity: number;
	finalPrice: number; // after discounts
}
```

- **Used By**: `cartStore`, `CartSidebar`
- **Critique**: Missing `image_url` — **add for UI**.

---

### `Transaction` (Checkout Payload)

```ts
{
  transactionId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'gcash';
  customerName?: string;
  customerEmail?: string;
  deliveryAddress?: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered';
}
```

- **Used By**: Checkout, confirmation page
- **Critique**: Already exists in `Receipt.svelte` — reuse fields.

---

### `Discount` (from `DiscountSchema`)

```ts
{
	id: string;
	name: string;
	amount: number;
	is_percentage: boolean;
	minimum_purchase_amount: number | null;
	start_date: string;
	end_date: string | null;
	active: boolean;
}
```

- **Used By**: `cartStore.finalizeCart()` — apply if `total >= minimum_purchase_amount`
- **Critique**: Strong. Can be reused as-is.

---

## 🧩 3. Required Components for `/store`

### `ProductCard.svelte`

- Displays: image, name, price, stock status
- Action: "Add to Cart" button (disabled if `stock <= 0`)
- Uses: `Product`, `sanitizeImageUrl`

### `ProductDetailModal.svelte`

- Modal or page showing full product info
- Includes: description, image, price, stock
- Action: quantity selector + "Add to Cart"

### `SearchBar.svelte`

- Input with bind to `$searchTerm`
- Supports barcode scan (via `handleBarcodeScanned`)
- Debounced

### `CategoryFilter.svelte`

- Chips for each category (e.g., "Produce", "Dairy")
- Active category highlight

### `CartSidebar.svelte`

- Slide-in panel showing cart items
- Edit quantity, remove item
- Shows subtotal, discount, total
- "Checkout" button

### `CheckoutForm.svelte`

- Fields:
  - Full Name (`required`)
  - Email (`required`, email format)
  - Delivery Address (`required`)
  - Payment Method (`cash` or `gcash`)
  - GCash Reference (if GCash selected)
- On submit: create `Transaction`, show confirmation

### `OrderConfirmation.svelte`

- Show order ID, items, total, payment method
- Estimated delivery time
- "Continue Shopping" button

---

## 🧠 4. Required Stores

### `cartStore` (Existing — Reuse)

- Methods: `add(item)`, `update(id, qty)`, `remove(id)`, `finalizeCart()`
- Derived: `subtotal`, `total`, `itemCount`
- **Add**: `clear()` after successful checkout

### `products` (Existing — Reuse)

- Already loads from API or IndexedDB
- Filtered by `!is_archived` and `stock > 0` for `/store`

### `categories` (Existing — Reuse)

- Used for filtering
- Load once on app start

### `discounts` (New or Reuse)

- Load active discounts (`active && now between start/end`)
- Apply in `finalizeCart()` if conditions met

---

## 🔐 5. Authentication & Roles (Minimal)

### Goal: **Guest shopping with staff override**

We keep role logic **minimal** but compatible with existing system.

### `User` (from `users` store)

```ts
{
  id: string;
  name: string;
  role: 'customer' | 'staff' | 'admin' | 'cashier' | 'manager';
  pin_hash?: string; // for staff login
}
```

### Login Flow for `/store`

- **Customers**: No login. Shop as guest.
- **Staff**: Optional PIN login (e.g., for price override, manual entry).
- **Role Impact**:
  - If `user.role === 'staff'`, show "Staff Mode" badge and admin tools.
  - Else, hide all internal UI.

### Session Store

- Use `sessionStore` to hold:
  ```ts
  { user: User | null, isAuthenticated: boolean }
  ```
- Set on PIN login (via `/login` action).
- Check in `+layout.svelte` for `/store`.

---

## 📁 6. File Structure for `/store`

```
src/
├── routes/
│   └── store/
│       ├── +page.svelte          # Main storefront
│       ├── +page.server.ts       # Load products, categories, discounts
│       └── checkout/
│           ├── +page.svelte      # Checkout form
│           └── success/
│               └── +page.svelte  # Order confirmation
├── lib/
│   ├── stores/
│   │   ├── cartStore.ts          # Reuse/extend
│   │   └── productStore.ts       # Reuse
│   ├── schemas/
│   │   ├── productSchema.ts      # Reuse
│   │   └── discountSchema.ts     # Reuse
│   └── components/
│       ├── store/
│       │   ├── ProductCard.svelte
│       │   ├── SearchBar.svelte
│       │   ├── CategoryFilter.svelte
│       │   ├── CartSidebar.svelte
│       │   └── CheckoutForm.svelte
│       └── ui/                   # shadcn-svelte
└── assets/
    └── images/
        └── placeholder.svg
```

---

## 🧪 7. Server-Side Requirements

### `src/routes/store/+page.server.ts`

```ts
export const load = async () => {
	const products = await getActiveProducts(); // exclude archived, low stock?
	const categories = await getCategories();
	const discounts = await getActiveDiscounts();

	return { products, categories, discounts };
};
```

### `src/routes/store/checkout/+page.server.ts`

```ts
export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		// Validate with Zod
		// Create Transaction
		// Return success, redirect to /store/checkout/success
	}
};
```

---

## ✅ 8. Final MVP Checklist

| Item                                                          | Status |
| ------------------------------------------------------------- | ------ |
| Reuse `productSchema`, `categorySchema`, `DiscountSchema`     | ✅     |
| Reuse `products`, `categories`, `cartStore`                   | ✅     |
| Build `/store/+page.svelte` with search, filter, product grid | ✅     |
| Add "Add to Cart" with stock check                            | ✅     |
| Implement cart sidebar with edit/remove                       | ✅     |
| Guest checkout with name, email, address, payment             | ✅     |
| Order confirmation page                                       | ✅     |
| Staff login via PIN (optional)                                | ✅     |
| Hide internal UI from guests                                  | ✅     |
| Use `sanitizeImageUrl` for safe image rendering               | ✅     |
| No account creation, no order history (post-MVP)              | ✅     |

---

## 🚀 Next Step

Would you like me to generate the **full code for `/store/+page.svelte`** and **`CartStore.ts`** to start building this?
