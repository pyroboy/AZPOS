import { derived } from 'svelte/store';

import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';

import { browser } from '$app/environment';

import type {

Product,

ProductInput,

ProductFilters,

ProductMeta,

PaginatedProducts,

BulkProductUpdate,

StockAdjustment

} from '$lib/types/product.schema';





/**

* Normalizes filter object for consistent query key generation

* Handles null/undefined values and ensures stable serialization

*/

function normalizeFilters(filters?: ProductFilters | null): Record<string, unknown> | null {

if (!filters || typeof filters !== 'object') {

return null;

}



// Remove undefined values and sort keys for consistency

const normalized: Record<string, unknown> = {};

const keys = Object.keys(filters).sort();


for (const key of keys) {

const value = filters[key as keyof ProductFilters];


// Skip undefined values but keep null, false, 0, and empty strings

if (value !== undefined) {

// For arrays, sort them for consistency

if (Array.isArray(value)) {

normalized[key] = [...value].sort();

} else {

normalized[key] = value;

}

}

}



// Return null if no meaningful filters are present

return Object.keys(normalized).length > 0 ? normalized : null;

}



// Helper function to call Telefunc functions via TanStack Query

async function callTelefunc(functionName: string, args: any[] = []) {

const response = await fetch('/api/telefunc', {

method: 'POST',

headers: {

'Content-Type': 'application/json'

},

body: JSON.stringify({

telefuncName: functionName,

telefuncArgs: args

})

});



if (!response.ok) {

throw new Error(`Telefunc call failed: ${response.statusText}`);

}



const result = await response.json();

return result.ret; // Unwrap the Telefunc response

}



// Use Telefunc to fetch products with filters

async function fetchProducts(filters?: ProductFilters): Promise<PaginatedProducts> {

console.log('📡 [TELEFUNC] Fetching products with filters:', filters);

// Pass an empty array if filters are not provided, otherwise pass the filters.

return callTelefunc('onGetProducts', filters ? [filters] : []);

}



// Query keys for consistent cache management

const productQueryKeys = {

all: ['products'] as const,

lists: () => [...productQueryKeys.all, 'list'] as const,

list: (filters?: ProductFilters | null) => {

const normalizedFilters = normalizeFilters(filters);

return [...productQueryKeys.lists(), normalizedFilters] as const;

},

details: () => [...productQueryKeys.all, 'detail'] as const,

detail: (id: string) => [...productQueryKeys.details(), id] as const,

meta: () => [...productQueryKeys.all, 'meta'] as const

};



export function useProducts(filters?: ProductFilters) {

const queryClient = useQueryClient();



console.log('🔧 [TANSTACK] Query setup debug:', {

browser,

filters,

queryKey: productQueryKeys.list(filters),

environment: typeof window !== 'undefined' ? 'client' : 'server'

});



// Query to fetch paginated products with filters

const productsQuery = createQuery<PaginatedProducts>({

queryKey: productQueryKeys.list(filters),

queryFn: async () => {

console.log('🔄 [TANSTACK] Starting product query with filters:', filters);

try {

const result = await fetchProducts(filters);

console.log('✅ [TANSTACK] Product query successful. Count:', result.products?.length || 0);

return result;

} catch (error) {

console.error('🚨 [TANSTACK] Product query failed:', error);

throw error;

}

},

staleTime: 1000 * 60 * 2, // 2 minutes

gcTime: 1000 * 60 * 10, // 10 minutes

enabled: browser, // Only run on client-side

retry: 3,

retryDelay: 1000

});



console.log('🔍 [TANSTACK] Query created with state:', {

status: productsQuery.status,

fetchStatus: productsQuery.fetchStatus,

isPending: productsQuery.isPending,

isError: productsQuery.isError,

isSuccess: productsQuery.isSuccess,

data: productsQuery.data,

error: productsQuery.error

});



// Query to fetch product meta information

const metaQuery = createQuery<ProductMeta>({

queryKey: productQueryKeys.meta(),

queryFn: () => callTelefunc('onGetProductMeta'),

staleTime: 1000 * 60 * 5, // 5 minutes

gcTime: 1000 * 60 * 15, // 15 minutes

enabled: browser // Only run on client-side

});



// Mutation to create a new product

const createProductMutation = createMutation({

mutationFn: (productData: ProductInput) => callTelefunc('onCreateProduct', [productData]),

onSuccess: (newProduct) => {

// Invalidate and refetch products list

queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() });

queryClient.invalidateQueries({ queryKey: productQueryKeys.meta() });



// Optimistically add the new product to cache

queryClient.setQueryData<PaginatedProducts>(productQueryKeys.list(filters), (oldData) => {

if (!oldData)

return {

products: [newProduct],

pagination: { page: 1, limit: 20, total: 1, total_pages: 1, has_more: false }

};

return {

...oldData,

products: [newProduct, ...oldData.products],

pagination: {

...oldData.pagination,

total: oldData.pagination.total + 1

}

};

});

},

onError: (error) => {

console.error('Failed to create product:', error);

}

});



// Mutation to update a product

const updateProductMutation = createMutation({

mutationFn: ({

productId,

productData

}: {

productId: string;

productData: Partial<ProductInput>;

}) => callTelefunc('onUpdateProduct', [productId, productData]),

onSuccess: (updatedProduct) => {

// Update the specific product in all relevant queries

queryClient.setQueryData<PaginatedProducts>(productQueryKeys.list(filters), (oldData) => {

if (!oldData) return oldData;

return {

...oldData,

products: oldData.products.map((product) =>

product.id === updatedProduct.id ? updatedProduct : product

)

};

});



// Update detail cache if it exists

queryClient.setQueryData(productQueryKeys.detail(updatedProduct.id), updatedProduct);



// Invalidate meta to get fresh calculations

queryClient.invalidateQueries({ queryKey: productQueryKeys.meta() });

},

onError: (error) => {

console.error('Failed to update product:', error);

}

});



// Mutation for bulk product updates

const bulkUpdateMutation = createMutation({

mutationFn: (updateData: BulkProductUpdate) => callTelefunc('onBulkUpdateProducts', [updateData]),

onSuccess: (updatedProducts) => {

// Update all affected products in cache

queryClient.setQueryData<PaginatedProducts>(productQueryKeys.list(filters), (oldData) => {

if (!oldData) return oldData;

const updatedProductsMap = new Map(updatedProducts.map((p) => [p.id, p]));

return {

...oldData,

products: oldData.products.map((product) => updatedProductsMap.get(product.id) || product)

};

});



// Update individual detail caches

updatedProducts.forEach((product) => {

queryClient.setQueryData(productQueryKeys.detail(product.id), product);

});



// Invalidate meta

queryClient.invalidateQueries({ queryKey: productQueryKeys.meta() });

},

onError: (error) => {

console.error('Failed to bulk update products:', error);

}

});



// Mutation for stock adjustment

const adjustStockMutation = createMutation({

mutationFn: (adjustmentData: StockAdjustment) => callTelefunc('onAdjustStock', [adjustmentData]),

onSuccess: (updatedProduct) => {

// Update product in all relevant caches

queryClient.setQueryData<PaginatedProducts>(productQueryKeys.list(filters), (oldData) => {

if (!oldData) return oldData;

return {

...oldData,

products: oldData.products.map((product) =>

product.id === updatedProduct.id ? updatedProduct : product

)

};

});



// Update detail cache

queryClient.setQueryData(productQueryKeys.detail(updatedProduct.id), updatedProduct);



// Invalidate meta for fresh stock calculations

queryClient.invalidateQueries({ queryKey: productQueryKeys.meta() });

},

onError: (error) => {

console.error('Failed to adjust stock:', error);

}

});



// Mutation to delete a product

const deleteProductMutation = createMutation({

mutationFn: (productId: string) => callTelefunc('onDeleteProduct', [productId]),

onSuccess: (_, productId) => {

// Remove from all lists (or mark as archived)

queryClient.setQueryData<PaginatedProducts>(productQueryKeys.list(filters), (oldData) => {

if (!oldData) return oldData;

return {

...oldData,

products: oldData.products.map((product) =>

product.id === productId ? { ...product, is_archived: true, is_active: false } : product

),

pagination: {

...oldData.pagination,

total: oldData.pagination.total - 1

}

};

});



// Update detail cache to show archived status

queryClient.setQueryData<Product>(productQueryKeys.detail(productId), (oldData) =>

oldData ? { ...oldData, is_archived: true, is_active: false } : oldData

);



// Invalidate meta

queryClient.invalidateQueries({ queryKey: productQueryKeys.meta() });

},

onError: (error) => {

console.error('Failed to delete product:', error);

}

});



// Derived stores for reactive state management

const products = derived(productsQuery, ($query) => $query.data?.products ?? []);

const pagination = derived(productsQuery, ($query) => $query.data?.pagination);

const isLoading = derived(productsQuery, ($query) => $query.isPending);

const isError = derived(productsQuery, ($query) => $query.isError);

const error = derived(productsQuery, ($query) => $query.error);



const meta = derived(metaQuery, ($query) => $query.data);

const isMetaLoading = derived(metaQuery, ($query) => $query.isPending);

const isMetaError = derived(metaQuery, ($query) => $query.isError);



const activeProducts = derived(products, ($products) =>

$products.filter((p) => p.is_active && !p.is_archived)

);

const archivedProducts = derived(products, ($products) =>

$products.filter((p) => p.is_archived)

);

const bundleProducts = derived(products, ($products) =>

$products.filter((p) => p.is_bundle)

);

const lowStockProducts = derived(products, ($products) =>

$products.filter((p) => p.min_stock_level && p.stock_quantity < p.min_stock_level)

);

const outOfStockProducts = derived(products, ($products) =>

$products.filter((p) => p.stock_quantity === 0)

);



return {

// Original queries

productsQuery,

metaQuery,



// Derived state stores

products,

pagination,

isLoading,

isError,

error,

meta,

isMetaLoading,

isMetaError,



// Derived filtered lists

activeProducts,

archivedProducts,

bundleProducts,

lowStockProducts,

outOfStockProducts,



// Mutations (returning the whole mutation store)

createProduct: createProductMutation,

updateProduct: updateProductMutation,

bulkUpdate: bulkUpdateMutation,

adjustStock: adjustStockMutation,

deleteProduct: deleteProductMutation,



// Utility functions

refetch: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() }),

refetchMeta: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.meta() })

};

}



// Hook for fetching a single product by ID

export function useProduct(productId: string) {

const queryClient = useQueryClient();



const productQuery = createQuery<Product | null>({

queryKey: productQueryKeys.detail(productId),

queryFn: () => callTelefunc('onGetProductById', [productId]),

staleTime: 1000 * 60 * 5, // 5 minutes

gcTime: 1000 * 60 * 15, // 15 minutes

enabled: browser && !!productId // Only run on client-side

});



const product = derived(productQuery, ($query) => $query.data);

const isLoading = derived(productQuery, ($query) => $query.isPending);

const isError = derived(productQuery, ($query) => $query.isError);

const error = derived(productQuery, ($query) => $query.error);



return {

productQuery,

product,

isLoading,

isError,

error,

refetch: () => queryClient.invalidateQueries({ queryKey: productQueryKeys.detail(productId) })

};

}



// Hook for optimistic product updates

export function useOptimisticProductUpdate() {

const queryClient = useQueryClient();



return {

// Optimistically update product in cache before server response

updateProductOptimistic: (productId: string, updates: Partial<Product>) => {

// Update all relevant queries optimistically

queryClient.setQueriesData<PaginatedProducts>(

{ queryKey: productQueryKeys.lists() },

(oldData) => {

if (!oldData) return oldData;

return {

...oldData,

products: oldData.products.map((product) =>

product.id === productId

? { ...product, ...updates, updated_at: new Date().toISOString() }

: product

)

};

}

);



// Update detail cache if it exists

queryClient.setQueriesData<Product>({ queryKey: productQueryKeys.details() }, (oldData) =>

oldData?.id === productId

? { ...oldData, ...updates, updated_at: new Date().toISOString() }

: oldData

);

},



// Optimistically adjust stock

adjustStockOptimistic: (productId: string, newQuantity: number) => {

queryClient.setQueriesData<PaginatedProducts>(

{ queryKey: productQueryKeys.lists() },

(oldData) => {

if (!oldData) return oldData;

return {

...oldData,

products: oldData.products.map((product) =>

product.id === productId

? { ...product, stock_quantity: newQuantity, updated_at: new Date().toISOString() }

: product

)

};

}

);



queryClient.setQueriesData<Product>({ queryKey: productQueryKeys.details() }, (oldData) =>

oldData?.id === productId

? { ...oldData, stock_quantity: newQuantity, updated_at: new Date().toISOString() }

: oldData

);

}

};

}



// Note: Product search with debouncing should be implemented in Svelte components

// using $derived and $effect runes, as they can only be used in .svelte files