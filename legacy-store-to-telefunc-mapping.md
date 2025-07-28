# Legacy Store Dependencies to Telefunc Functions Mapping

This document analyzes each `+page.server.ts` file in the codebase and maps the legacy store dependencies to appropriate Telefunc functions that should be called directly in the server load functions.

## Files Analyzed

### 1. `/src/routes/pos/+page.server.ts`
**Current Legacy Dependencies:**
- `products` from `$lib/stores/productStore.svelte`
- `get(products)` to access product data
- `products.loadProducts(fetch)` method

**Required Data:**
- Product data for the POS interface

**Telefunc Mapping:**
- Replace with: `onGetProducts()` from `$lib/server/telefuncs/product.telefunc.ts`
- This provides paginated products with full product data including categories and suppliers

**Recommended Change:**
```typescript
// Instead of:
import { products } from '$lib/stores/productStore.svelte';
import { get } from 'svelte/store';

export const load: PageServerLoad = async ({ fetch }) => {
  await products.loadProducts(fetch);
  return { products: get(products) };
};

// Use:
import { onGetProducts } from '$lib/server/telefuncs/product.telefunc';

export const load: PageServerLoad = async () => {
  const productsData = await onGetProducts({ is_active: true });
  return { products: productsData };
};
```

### 2. `/src/routes/reports/audit-trail/+page.server.ts`
**Current Legacy Dependencies:**
- `inventoryAdjustments` from `$lib/stores/stockTransactionStore.svelte`
- `products` from `$lib/stores/productStore.svelte`
- `users` from `$lib/stores/userStore.svelte`
- Methods: `inventoryAdjustments.getAllAdjustments()`, `products.getActiveProducts()`, `users.getAllActiveUsers()`

**Required Data:**
- Stock transaction/adjustment data
- Product data for product names
- User data for user names

**Telefunc Mapping:**
- Replace `inventoryAdjustments.getAllAdjustments()` with: `onGetStockTransactions()` from `$lib/server/telefuncs/stockTransaction.telefunc.ts`
- Replace `products.getActiveProducts()` with: `onGetProducts({ is_active: true })` from `$lib/server/telefuncs/product.telefunc.ts`
- Replace `users.getAllActiveUsers()` with: `onGetUsers({ is_active: true })` from `$lib/server/telefuncs/user.telefunc.ts`

**Recommended Change:**
```typescript
// Instead of multiple store calls, use:
import { onGetStockTransactions } from '$lib/server/telefuncs/stockTransaction.telefunc';
import { onGetProducts } from '$lib/server/telefuncs/product.telefunc';
import { onGetUsers } from '$lib/server/telefuncs/user.telefunc';

export const load: PageServerLoad = async ({ parent }) => {
  const { user } = await parent();
  if (!ALLOWED_ROLES.includes(user.role)) {
    throw redirect(302, '/reports');
  }

  const [stockTransactions, products, users] = await Promise.all([
    onGetStockTransactions(),
    onGetProducts({ is_active: true }),
    onGetUsers({ is_active: true })
  ]);

  // Process the data as needed for the audit trail
  const detailedAdjustments = stockTransactions.transactions.map(transaction => {
    const product = products.products?.find(p => p.id === transaction.product_id);
    const processedByUser = users.users?.find(u => u.id === transaction.processed_by);
    return {
      ...transaction,
      productName: product?.name ?? 'Unknown Product',
      userName: processedByUser?.full_name ?? 'System'
    };
  });

  return { transactions: detailedAdjustments };
};
```

### 3. `/src/routes/reports/expiration/+page.server.ts`
**Current Legacy Dependencies:**
- `get(productBatches)` from `$lib/stores/productBatchStore.svelte` (note: this file doesn't exist, data is in inventoryStore)
- `get(products)` from `$lib/stores/productStore.svelte`

**Required Data:**
- Product batch data with expiration dates
- Product data for product names

**Telefunc Mapping:**
- Product batch data is not directly available via Telefunc currently
- Replace `get(products)` with: `onGetProducts()` from `$lib/server/telefuncs/product.telefunc.ts`
- **Note**: Need to create a Telefunc function for product batch data or include batch information in the product Telefunc

**Recommended Approach:**
1. Create a new Telefunc function for product batches, or
2. Extend `onGetProducts()` to include batch information when needed
3. Use `onGetProducts()` for product data

### 4. `/src/routes/reports/inventory-velocity/+page.server.ts`
**Current Legacy Dependencies:**
- `get(transactionStore)` from `$lib/stores/transactionStore.svelte`
- Products and productBatches from parent loader
- `getTotalStockForProduct()` utility function

**Required Data:**
- Transaction data for sales analysis
- Product data for product information
- Product batch data for current stock levels

**Telefunc Mapping:**
- Replace `get(transactionStore)` with: `onGetTransactions()` from `$lib/server/telefuncs/transaction.telefunc.ts`
- Use existing product data from parent or call `onGetProducts()` if needed
- **Note**: Product batch functionality needs to be available via Telefunc

### 5. `/src/routes/reports/profit-margin/+page.server.ts`
**Current Legacy Dependencies:**
- `get(inventoryAdjustments)` from `$lib/stores/stockTransactionStore.svelte`
- `get(products)` from `$lib/stores/productStore.svelte`
- `get(productBatches)` from `$lib/stores/productBatchStore.svelte`

**Required Data:**
- Stock transaction data for COGS calculation
- Product data for pricing
- Product batch data for FIFO cost calculation

**Telefunc Mapping:**
- Replace inventory adjustments with: `onGetStockTransactions()` from `$lib/server/telefuncs/stockTransaction.telefunc.ts`
- Replace products with: `onGetProducts()` from `$lib/server/telefuncs/product.telefunc.ts`
- **Note**: Product batch data needs Telefunc implementation

### 6. `/src/routes/reports/sales/+page.server.ts`
**Current Legacy Dependencies:**
- `get(inventoryAdjustments)` from `$lib/stores/stockTransactionStore.svelte`
- `get(products)` from `$lib/stores/productStore.svelte`

**Required Data:**
- Stock transaction data for sales records
- Product data for product information

**Telefunc Mapping:**
- Replace with: `onGetStockTransactions()` and `onGetProducts()` as above

### 7. `/src/routes/reports/supplier-performance/+page.server.ts`
**Current Legacy Dependencies:**
- `suppliers as supplierStore` from `$lib/stores/supplierStore.svelte`
- `get(poStore)` from `$lib/stores/purchaseOrderStore.svelte`

**Required Data:**
- Supplier data
- Purchase order data

**Telefunc Mapping:**
- **Note**: No supplier or purchase order Telefunc functions found in the analyzed files
- Need to check: `$lib/server/telefuncs/supplier.telefunc.ts` and `$lib/server/telefuncs/purchaseOrder.telefunc.ts`

## Summary of Required Telefunc Functions

### Available Functions:
1. **onGetProducts()** - `$lib/server/telefuncs/product.telefunc.ts`
2. **onGetUsers()** - `$lib/server/telefuncs/user.telefunc.ts`
3. **onGetStockTransactions()** - `$lib/server/telefuncs/stockTransaction.telefunc.ts`
4. **onGetTransactions()** - `$lib/server/telefuncs/transaction.telefunc.ts`

### Missing/Needed Functions:
1. **Product Batch Functions** - Need to create or extend existing functions to include batch data with expiration information
2. **Supplier Functions** - Verify if `onGetSuppliers()` exists in supplier Telefunc
3. **Purchase Order Functions** - Verify if `onGetPurchaseOrders()` exists in purchaseOrder Telefunc

## Store Method Mappings:

| Legacy Store Method | Telefunc Replacement |
|---------------------|---------------------|
| `inventoryAdjustments.getAllAdjustments()` | `onGetStockTransactions()` |
| `products.getActiveProducts()` | `onGetProducts({ is_active: true })` |
| `users.getAllActiveUsers()` | `onGetUsers({ is_active: true })` |
| `get(productBatches)` | **NEEDS IMPLEMENTATION** |
| `get(products)` | `onGetProducts()` |
| `get(transactionStore)` | `onGetTransactions()` |

## Next Steps:
1. Implement or extend Telefunc functions for product batch data
2. Verify supplier and purchase order Telefunc functions exist
3. Update each +page.server.ts file to use Telefunc functions instead of store methods
4. Remove store imports from server-side files
5. Test each route to ensure data is correctly loaded
