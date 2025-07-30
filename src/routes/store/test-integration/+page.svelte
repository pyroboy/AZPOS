<script lang="ts">
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';

const queryClient = useQueryClient();

// Helper function to call Telefunc functions via TanStack Query
async function callTelefunc(functionName: string, args: any[] = []) {
    const response = await fetch('/_telefunc', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            file: '/src/lib/server/telefuncs/product.telefunc.ts',
            name: functionName,
            args: args
        })
    });

    if (!response.ok) {
        throw new Error(`Telefunc call failed: ${response.statusText}`);
    }

    const result = await response.json();
    return result.ret; // Unwrap the Telefunc response
}

// 1. TanStack Query + Telefunc for fetching products
const productsQuery = createQuery({
    queryKey: ['products-telefunc', { is_active: true, limit: 10 }],
    queryFn: () => callTelefunc('onGetProducts', [{ is_active: true, limit: 10 }]),
    enabled: browser,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 3
});

// 2. TanStack Query + Telefunc for fetching product metadata
const metaQuery = createQuery({
    queryKey: ['product-meta-telefunc'],
    queryFn: () => callTelefunc('onGetProductMeta'),
    enabled: browser,
    staleTime: 1000 * 60 * 5, // 5 minutes
});

// 3. TanStack Mutation + Telefunc for creating products
const createProductMutation = createMutation({
    mutationFn: (productData: any) => callTelefunc('onCreateProduct', [productData]),
    onSuccess: (newProduct) => {
        console.log('✅ Product created via Telefunc:', newProduct);
        
        // Invalidate and refetch products query
        queryClient.invalidateQueries({ queryKey: ['products-telefunc'] });
        queryClient.invalidateQueries({ queryKey: ['product-meta-telefunc'] });
        
        // Optimistically update the cache
        queryClient.setQueryData(['products-telefunc', { is_active: true, limit: 10 }], (oldData: any) => {
            if (!oldData) return oldData;
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
        console.error('❌ Failed to create product:', error);
    }
});

// 4. TanStack Mutation + Telefunc for stock adjustment
const adjustStockMutation = createMutation({
    mutationFn: ({ productId, adjustment }: { productId: string, adjustment: any }) => 
        callTelefunc('onAdjustStock', [{ product_id: productId, ...adjustment }]),
    onSuccess: (updatedProduct, variables) => {
        console.log('✅ Stock adjusted via Telefunc:', updatedProduct);
        
        // Update the specific product in the cache
        queryClient.setQueryData(['products-telefunc', { is_active: true, limit: 10 }], (oldData: any) => {
            if (!oldData) return oldData;
            return {
                ...oldData,
                products: oldData.products.map((product: any) =>
                    product.id === variables.productId ? updatedProduct : product
                )
            };
        });
        
        // Invalidate meta to refresh stock calculations
        queryClient.invalidateQueries({ queryKey: ['product-meta-telefunc'] });
    }
});

// Test functions
function handleCreateProduct() {
    const testProduct = {
        name: 'Test Product via TanStack + Telefunc',
        sku: `TEST-${Date.now()}`,
        description: 'Created via TanStack Query + Telefunc integration',
        category_id: 'df814aa3-5711-477c-bfba-a9ebc77281bc',
        supplier_id: '435bfcd8-c69a-4ca5-91ed-abd91843ad41',
        cost_price: 50,
        selling_price: 60,
        stock_quantity: 100,
        min_stock_level: 10,
        max_stock_level: 200,
        is_active: true
    };
    
    createProductMutation.mutate(testProduct);
}

function handleAdjustStock(productId: string) {
    const adjustment = {
        adjustment_type: 'increase',
        quantity: 5,
        reason: 'Test adjustment via TanStack + Telefunc',
        notes: 'Integration test'
    };
    
    adjustStockMutation.mutate({ productId, adjustment });
}

// Reactive state for display
$: testData = {
    products: {
        status: $productsQuery.status,
        isPending: $productsQuery.isPending,
        isSuccess: $productsQuery.isSuccess,
        isError: $productsQuery.isError,
        data: $productsQuery.data,
        error: $productsQuery.error?.message
    },
    meta: {
        status: $metaQuery.status,
        data: $metaQuery.data,
        error: $metaQuery.error?.message
    },
    mutations: {
        creating: $createProductMutation.isPending,
        adjusting: $adjustStockMutation.isPending,
        createError: $createProductMutation.error?.message,
        adjustError: $adjustStockMutation.error?.message
    }
};
</script>

<svelte:head>
    <title>TanStack Query + Telefunc Integration Test</title>
</svelte:head>

<div class="p-8">
    <h1 class="text-2xl font-bold mb-4">TanStack Query + Telefunc Integration Test</h1>
    
    <div class="space-y-6">
        <!-- Environment Info -->
        <div class="p-4 border rounded bg-blue-50">
            <h2 class="font-semibold mb-2">Integration Overview</h2>
            <div class="text-sm space-y-1">
                <p>• <strong>TanStack Query:</strong> Managing reactive state, caching, mutations</p>
                <p>• <strong>Telefunc:</strong> Type-safe server function calls</p>
                <p>• <strong>Integration:</strong> TanStack Query wraps Telefunc calls for optimal UX</p>
                <p>• <strong>Benefits:</strong> Caching, optimistic updates, error handling, retry logic</p>
            </div>
        </div>

        <!-- Products Query Results -->
        <div class="p-4 border rounded">
            <h2 class="font-semibold mb-2">Products Query (TanStack + Telefunc)</h2>
            
            <div class="grid grid-cols-3 gap-4 text-sm mb-4">
                <div>
                    <p>Status: {testData.products.status}</p>
                    <p>Pending: {testData.products.isPending}</p>
                </div>
                <div>
                    <p>Success: {testData.products.isSuccess}</p>
                    <p>Error: {testData.products.isError}</p>
                </div>
                <div>
                    <p>Products: {testData.products.data?.products?.length || 0}</p>
                    <p>Total: {testData.products.data?.pagination?.total || 0}</p>
                </div>
            </div>

            {#if testData.products.isPending}
                <div class="p-4 bg-blue-100 border border-blue-300 rounded">
                    <p>🔄 Loading products via TanStack + Telefunc...</p>
                </div>
            {/if}

            {#if testData.products.isError}
                <div class="p-4 bg-red-100 border border-red-300 rounded">
                    <p class="font-semibold text-red-800">❌ Query Failed</p>
                    <p class="text-red-700">Error: {testData.products.error}</p>
                </div>
            {/if}

            {#if testData.products.isSuccess}
                <div class="p-4 bg-green-100 border border-green-300 rounded">
                    <p class="font-semibold text-green-800">✅ Query Success!</p>
                    <p class="text-green-700">Products: {testData.products.data?.products?.length || 0}</p>
                    <p class="text-green-700">Total in DB: {testData.products.data?.pagination?.total || 0}</p>
                    
                    {#if testData.products.data?.products?.[0]}
                        <div class="mt-2">
                            <p class="font-medium">Sample product:</p>
                            <pre class="text-xs bg-white p-2 rounded mt-1 overflow-auto max-h-32">{JSON.stringify(testData.products.data.products[0], null, 2)}</pre>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <!-- Meta Query Results -->
        <div class="p-4 border rounded">
            <h2 class="font-semibold mb-2">Product Meta Query (TanStack + Telefunc)</h2>
            
            <div class="text-sm mb-4">
                <p>Status: {testData.meta.status}</p>
            </div>

            {#if testData.meta.data}
                <div class="p-4 bg-green-100 border border-green-300 rounded">
                    <p class="font-semibold text-green-800">✅ Meta Query Success!</p>
                    <div class="grid grid-cols-2 gap-4 text-sm text-green-700 mt-2">
                        <div>
                            <p>Total Products: {testData.meta.data.total_products}</p>
                            <p>Active Products: {testData.meta.data.active_products}</p>
                            <p>Low Stock: {testData.meta.data.low_stock_count}</p>
                        </div>
                        <div>
                            <p>Out of Stock: {testData.meta.data.out_of_stock_count}</p>
                            <p>Categories: {testData.meta.data.categories_count}</p>
                            <p>Suppliers: {testData.meta.data.suppliers_count}</p>
                        </div>
                    </div>
                </div>
            {:else if testData.meta.error}
                <div class="p-4 bg-red-100 border border-red-300 rounded">
                    <p class="font-semibold text-red-800">❌ Meta Query Failed</p>
                    <p class="text-red-700">Error: {testData.meta.error}</p>
                </div>
            {/if}
        </div>

        <!-- Mutation Controls -->
        <div class="p-4 border rounded">
            <h2 class="font-semibold mb-2">Mutations (TanStack + Telefunc)</h2>
            
            <div class="space-y-4">
                <!-- Create Product -->
                <div class="p-4 border rounded">
                    <h3 class="font-medium mb-2">Create Product Mutation</h3>
                    <button 
                        class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                        disabled={testData.mutations.creating}
                        onclick={handleCreateProduct}
                    >
                        {testData.mutations.creating ? '⏳ Creating...' : '➕ Create Test Product'}
                    </button>
                    
                    {#if testData.mutations.createError}
                        <p class="text-red-600 text-sm mt-2">Error: {testData.mutations.createError}</p>
                    {/if}
                </div>

                <!-- Adjust Stock -->
                <div class="p-4 border rounded">
                    <h3 class="font-medium mb-2">Stock Adjustment Mutation</h3>
                    {#if testData.products.data?.products?.[0]}
                        <button 
                            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                            disabled={testData.mutations.adjusting}
                            onclick={() => handleAdjustStock(testData.products.data.products[0].id)}
                        >
                            {testData.mutations.adjusting ? '⏳ Adjusting...' : '📦 Adjust Stock (+5)'}
                        </button>
                        <p class="text-sm text-gray-600 mt-1">
                            Will adjust stock for: {testData.products.data.products[0].name}
                        </p>
                    {:else}
                        <p class="text-gray-500">Load products first to test stock adjustment</p>
                    {/if}
                    
                    {#if testData.mutations.adjustError}
                        <p class="text-red-600 text-sm mt-2">Error: {testData.mutations.adjustError}</p>
                    {/if}
                </div>
            </div>
        </div>

        <!-- Raw Test Data -->
        <div class="p-4 border rounded">
            <h2 class="font-semibold mb-2">Raw Integration Data</h2>
            <pre class="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-96">{JSON.stringify(testData, null, 2)}</pre>
        </div>

        <!-- Integration Benefits -->
        <div class="p-4 border rounded bg-yellow-50">
            <h2 class="font-semibold mb-2">Why This Integration is Powerful</h2>
            <ul class="text-sm space-y-1">
                <li>✅ <strong>Type Safety:</strong> Telefunc provides end-to-end type safety</li>
                <li>✅ <strong>Caching:</strong> TanStack Query caches Telefunc responses intelligently</li>
                <li>✅ <strong>Optimistic Updates:</strong> UI updates immediately, syncs with server</li>
                <li>✅ <strong>Error Handling:</strong> Automatic retry and error management</li>
                <li>✅ <strong>Cache Invalidation:</strong> Smart cache updates after mutations</li>
                <li>✅ <strong>Loading States:</strong> Built-in pending/success/error states</li>
                <li>✅ <strong>Background Refetch:</strong> Keeps data fresh automatically</li>
            </ul>
        </div>
    </div>
</div>
