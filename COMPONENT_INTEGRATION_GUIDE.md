# Component Integration Guide: TanStack Query + Telefunc Pattern

This guide outlines how to integrate Svelte 5 components with our new server-centric architecture using TanStack Query and Telefunc.

!!! IMPORTANT - DO NOT CREATE EXAMPLE FILE
!!! IMPORTANT - LINT the files in question after integration

## Architecture Overview

Our new pattern follows these principles:

1. **Server is the Single Source of Truth**: Supabase database holds the real state
2. **Clear Separation of Concerns**: UI components only handle display and user input
3. **End-to-End Type Safety**: Zod schemas define contracts between client and server
4. **Declarative Data Fetching**: TanStack Query manages server state automatically
5. **Secure by Default**: All business logic lives on the server

## Folder Structure

```
src/lib/
├── components/           # UI components (presentation only)
├── data/                # TanStack Query hooks (replaces /stores)
├── server/
│   └── telefuncs/       # Server-side business logic
└── types/               # Zod schemas and TypeScript types
```

## Step-by-Step Migration Guide

### Step 1: Identify Your Component's Data Dependencies

Before migrating, identify what data your component needs:

```svelte
<!-- OLD: Legacy store usage -->
<script>
	import { productStore } from '$lib/stores/productStore.svelte.ts';

	// Component directly accesses store state
	const products = productStore.products;
	const isLoading = productStore.isLoading;
</script>
```

### Step 2: Replace Store Imports with Data Hooks

```svelte
<!-- NEW: TanStack Query hook usage -->
<script>
	import { useProducts } from '$lib/data/product.ts';

	// Component uses declarative data hook
	const {
		productsQuery,
		products,
		activeProducts,
		addProduct,
		updateProduct,
		deleteProduct,
		isLoading,
		error
	} = useProducts();
</script>
```

### Step 3: Update Template Logic

#### Before (Legacy Pattern):

```svelte
<!-- OLD: Direct store state access -->
{#if productStore.isLoading}
	<div>Loading...</div>
{:else if productStore.error}
	<div>Error: {productStore.error}</div>
{:else}
	{#each productStore.products as product}
		<ProductCard {product} />
	{/each}
{/if}
```

#### After (New Pattern):

```svelte
<!-- NEW: Query state management -->
{#if $productsQuery.isPending}
	<div>Loading...</div>
{:else if $productsQuery.isError}
	<div>Error: {$productsQuery.error.message}</div>
{:else}
	{#each products as product}
		<ProductCard {product} />
	{/each}
{/if}
```

### Step 4: Handle User Actions with Mutations

#### Before (Legacy Pattern):

```svelte
<script>
	import { productStore } from '$lib/stores/productStore.svelte.ts';

	function handleAddProduct(productData) {
		productStore.addProduct(productData);
	}
</script>

<button onclick={() => handleAddProduct(newProduct)}> Add Product </button>
```

#### After (New Pattern):

```svelte
<script>
	import { useProducts } from '$lib/data/product.ts';

	const { addProduct, addProductStatus } = useProducts();

	function handleAddProduct(productData) {
		addProduct(productData);
	}
</script>

<button onclick={() => handleAddProduct(newProduct)} disabled={addProductStatus === 'pending'}>
	{addProductStatus === 'pending' ? 'Adding...' : 'Add Product'}
</button>
```

## Complete Component Examples

### Example 1: Product List Component

```svelte
<!-- src/lib/components/products/ProductList.svelte -->
<script lang="ts">
	import { useProducts } from '$lib/data/product.ts';
	import ProductCard from './ProductCard.svelte';
	import LoadingSpinner from '../ui/LoadingSpinner.svelte';
	import ErrorMessage from '../ui/ErrorMessage.svelte';

	// Get data and actions from the hook
	const { productsQuery, products, activeProducts, deleteProduct, deleteProductStatus } =
		useProducts();

	// Handle product deletion
	function handleDelete(productId: string) {
		if (confirm('Are you sure you want to delete this product?')) {
			deleteProduct(productId);
		}
	}
</script>

<div class="product-list">
	<h2>Products ({activeProducts.length})</h2>

	{#if $productsQuery.isPending}
		<LoadingSpinner />
	{:else if $productsQuery.isError}
		<ErrorMessage error={$productsQuery.error} />
	{:else}
		<div class="grid">
			{#each activeProducts as product (product.id)}
				<ProductCard
					{product}
					onDelete={() => handleDelete(product.id)}
					isDeleting={deleteProductStatus === 'pending'}
				/>
			{/each}
		</div>

		{#if activeProducts.length === 0}
			<div class="empty-state">
				<p>No products found.</p>
				<a href="/products/new">Add your first product</a>
			</div>
		{/if}
	{/if}
</div>
```

### Example 2: Product Form Component

```svelte
<!-- src/lib/components/products/ProductForm.svelte -->
<script lang="ts">
	import { useProducts } from '$lib/data/product.ts';
	import { superForm } from 'sveltekit-superforms';
	import type { ProductInput } from '$lib/types/product.schema';

	export let data; // From +page.server.ts load function
	export let productId: string | undefined = undefined; // For editing

	const { addProduct, updateProduct, addProductStatus, updateProductStatus } = useProducts();

	const { form, enhance, errors } = superForm(data.form, {
		onSubmit: async () => {
			if (productId) {
				updateProduct({ id: productId, ...$form });
			} else {
				addProduct($form);
			}
		}
	});

	$: isSubmitting = addProductStatus === 'pending' || updateProductStatus === 'pending';
</script>

<form method="POST" use:enhance>
	<div class="form-group">
		<label for="name">Product Name</label>
		<input type="text" id="name" bind:value={$form.name} data-invalid={$errors.name} required />
		{#if $errors.name}
			<span class="error">{$errors.name}</span>
		{/if}
	</div>

	<div class="form-group">
		<label for="price">Price</label>
		<input
			type="number"
			id="price"
			bind:value={$form.selling_price}
			data-invalid={$errors.selling_price}
			step="0.01"
			min="0"
			required
		/>
		{#if $errors.selling_price}
			<span class="error">{$errors.selling_price}</span>
		{/if}
	</div>

	<div class="form-actions">
		<button type="submit" disabled={isSubmitting}>
			{#if isSubmitting}
				Saving...
			{:else}
				{productId ? 'Update' : 'Create'} Product
			{/if}
		</button>
		<a href="/products">Cancel</a>
	</div>
</form>
```

### Example 3: Cart Component with Real-time Updates

```svelte
<!-- src/lib/components/cart/CartSidebar.svelte -->
<script lang="ts">
	import { useCart } from '$lib/data/cart.ts';
	import CartItem from './CartItem.svelte';
	import CheckoutButton from './CheckoutButton.svelte';

	const {
		cartQuery,
		cartItems,
		cartTotals,
		updateQuantity,
		removeItem,
		clearCart,
		updateQuantityStatus
	} = useCart();

	// Handle quantity changes with optimistic updates
	function handleQuantityChange(itemId: string, newQuantity: number) {
		updateQuantity({ cart_item_id: itemId, quantity: newQuantity });
	}

	function handleRemoveItem(itemId: string) {
		removeItem(itemId);
	}
</script>

<aside class="cart-sidebar">
	<header>
		<h3>Shopping Cart</h3>
		{#if cartItems.length > 0}
			<button onclick={clearCart} class="clear-btn">Clear All</button>
		{/if}
	</header>

	<div class="cart-content">
		{#if $cartQuery.isPending}
			<div class="loading">Loading cart...</div>
		{:else if $cartQuery.isError}
			<div class="error">Failed to load cart</div>
		{:else if cartItems.length === 0}
			<div class="empty-cart">
				<p>Your cart is empty</p>
			</div>
		{:else}
			<div class="cart-items">
				{#each cartItems as item (item.cart_item_id)}
					<CartItem
						{item}
						onQuantityChange={(qty) => handleQuantityChange(item.cart_item_id, qty)}
						onRemove={() => handleRemoveItem(item.cart_item_id)}
						isUpdating={updateQuantityStatus === 'pending'}
					/>
				{/each}
			</div>

			<div class="cart-totals">
				<div class="subtotal">
					Subtotal: ${cartTotals.subtotal.toFixed(2)}
				</div>
				<div class="tax">
					Tax: ${cartTotals.tax_amount.toFixed(2)}
				</div>
				<div class="total">
					Total: ${cartTotals.total_amount.toFixed(2)}
				</div>
			</div>

			<CheckoutButton {cartItems} {cartTotals} />
		{/if}
	</div>
</aside>
```

## Best Practices

### 1. Component Responsibility

**✅ DO:**

- Keep components focused on UI rendering and user interaction
- Use data hooks for all server state management
- Handle loading and error states in the UI
- Use Superforms for form validation and submission

**❌ DON'T:**

- Put business logic in components
- Directly call Telefunc functions from components
- Manage server state manually with `$state`
- Mix client-side state with server state

### 2. Error Handling

```svelte
<script>
	const { productsQuery, addProduct } = useProducts();

	// Handle query errors
	$: if ($productsQuery.isError) {
		console.error('Failed to load products:', $productsQuery.error);
	}

	// Handle mutation errors
	function handleAddProduct(data) {
		addProduct(data, {
			onError: (error) => {
				alert(`Failed to add product: ${error.message}`);
			},
			onSuccess: () => {
				alert('Product added successfully!');
			}
		});
	}
</script>
```

### 3. Loading States

```svelte
<script>
	const { productsQuery, addProduct, addProductStatus } = useProducts();
</script>

<!-- Show different loading states -->
{#if $productsQuery.isPending}
	<div class="skeleton-loader">Loading products...</div>
{:else if $productsQuery.isFetching}
	<div class="refresh-indicator">Refreshing...</div>
{/if}

<!-- Disable actions during mutations -->
<button onclick={() => addProduct(data)} disabled={addProductStatus === 'pending'}>
	{addProductStatus === 'pending' ? 'Adding...' : 'Add Product'}
</button>
```

### 4. Optimistic Updates

```svelte
<script>
	const { updateProduct } = useProducts();

	function handleToggleActive(product) {
		updateProduct(
			{
				id: product.id,
				is_active: !product.is_active
			},
			{
				// Optimistic update - UI updates immediately
				optimisticData: (old) =>
					old?.map((p) => (p.id === product.id ? { ...p, is_active: !p.is_active } : p))
			}
		);
	}
</script>
```

## Migration Checklist

When migrating a component, ensure you:

- [ ] Replace store imports with data hook imports
- [ ] Update component props to receive data from hooks
- [ ] Replace direct store method calls with hook mutations
- [ ] Handle loading, error, and success states properly
- [ ] Use Superforms for form handling
- [ ] Test optimistic updates work correctly
- [ ] Verify type safety throughout the component
- [ ] Update any related tests

## Common Patterns

### Pattern 1: List with Search and Filters

```svelte
<script>
	import { useProducts } from '$lib/data/product.ts';

	let searchTerm = $state('');
	let categoryFilter = $state('all');

	const { productsQuery, products } = useProducts({
		filters: {
			search: searchTerm,
			category: categoryFilter === 'all' ? undefined : categoryFilter
		}
	});

	// Derived filtered products
	const filteredProducts = $derived(
		products.filter(
			(p) =>
				p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
				(categoryFilter === 'all' || p.category_id === categoryFilter)
		)
	);
</script>
```

### Pattern 2: Master-Detail View

```svelte
<script>
	import { useProducts } from '$lib/data/product.ts';

	let selectedProductId = $state(null);

	const { products, getProductById } = useProducts();

	const selectedProduct = $derived(selectedProductId ? getProductById(selectedProductId) : null);
</script>

<div class="master-detail">
	<div class="master">
		{#each products as product}
			<button
				onclick={() => (selectedProductId = product.id)}
				class:active={selectedProductId === product.id}
			>
				{product.name}
			</button>
		{/each}
	</div>

	<div class="detail">
		{#if selectedProduct}
			<ProductDetail product={selectedProduct} />
		{:else}
			<p>Select a product to view details</p>
		{/if}
	</div>
</div>
```

This guide should help you migrate your components systematically from the legacy RuneStore pattern to the new TanStack Query + Telefunc architecture. The key is to keep components focused on presentation while letting the data hooks handle all server state management.
