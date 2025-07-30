<script lang="ts">
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { onMount } from 'svelte';

const queryClient = useQueryClient();

// Helper function to call Telefunc functions
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

// TanStack Query + Telefunc integration
const productsQuery = createQuery({
    queryKey: ['test-products-telefunc'],
    queryFn: async () => {
        console.log('🧪 [TEST] TanStack + Telefunc query executing');
        const result = await callTelefunc('onGetProducts', [{ is_active: true, limit: 10 }]);
        console.log('🧪 [TEST] Query result:', result);
        return result;
    },
    enabled: browser, // Only run on client-side
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 3
});

// Test mutation for creating a product
const createProductMutation = createMutation({
    mutationFn: (productData: any) => {
        console.log('🧪 [TEST] Creating product via Telefunc:', productData);
        return callTelefunc('onCreateProduct', [productData]);
    },
    onSuccess: (newProduct) => {
        console.log('✅ [TEST] Product created successfully:', newProduct);
        // Invalidate and refetch the products query
        queryClient.invalidateQueries({ queryKey: ['test-products-telefunc'] });
    },
    onError: (error) => {
        console.error('🚨 [TEST] Failed to create product:', error);
    }
});

// Test function to create a sample product
function handleCreateTestProduct() {
    const testProduct = {
        name: `Test Product ${Date.now()}`,
        sku: `TEST-${Date.now()}`,
        description: 'Test product created via TanStack + Telefunc',
        category_id: 'df814aa3-5711-477c-bfba-a9ebc77281bc',
        supplier_id: '435bfcd8-c69a-4ca5-91ed-abd91843ad41',
        cost_price: 25,
        selling_price: 30,
        stock_quantity: 50,
        min_stock_level: 10,
        max_stock_level: 100,
        is_active: true
    };
    
    createProductMutation.mutate(testProduct);
}

// Reactive debug info
$: debugInfo = {
    products: {
        status: $productsQuery.status,
        fetchStatus: $productsQuery.fetchStatus,
        isPending: $productsQuery.isPending,
        isSuccess: $productsQuery.isSuccess,
        isError: $productsQuery.isError,
        data: $productsQuery.data,
        error: $productsQuery.error?.message
    },
    createMutation: {
        isPending: $createProductMutation.isPending,
        isSuccess: $createProductMutation.isSuccess,
        isError: $createProductMutation.isError,
        error: $createProductMutation.error?.message
    }
};

onMount(() => {
    console.log('🧪 [TEST] TanStack + Telefunc component mounted');
    console.log('🧪 [TEST] Browser:', browser, 'Window:', typeof window !== 'undefined');
});
</script>

<svelte:head>
	<title>TanStack + Telefunc Test Page</title>
</svelte:head>

<div class="p-8">
	<h1 class="text-2xl font-bold mb-4">TanStack Query + Telefunc Integration Test</h1>
	
	<!-- Integration Overview -->
	<div class="p-4 border rounded bg-blue-50 mb-6">
		<h2 class="font-semibold mb-2">🔥 What This Page Demonstrates</h2>
		<ul class="text-sm space-y-1">
			<li>✅ <strong>TanStack Query + Telefunc:</strong> Perfect integration for type-safe client-server communication</li>
			<li>✅ <strong>Queries:</strong> Fetch data with caching, retry logic, and loading states</li>
			<li>✅ <strong>Mutations:</strong> Create/update data with optimistic updates and cache invalidation</li>
			<li>✅ <strong>Reactive State:</strong> Automatic UI updates when data changes</li>
			<li>✅ <strong>Error Handling:</strong> Built-in error management and user feedback</li>
		</ul>
	</div>
	
	<div class="space-y-4">
		<div class="p-4 border rounded">
			<h2 class="font-semibold mb-2">Environment Info</h2>
			<p>Browser: {browser}</p>
			<p>Window defined: {typeof window !== 'undefined'}</p>
		</div>

		<div class="p-4 border rounded">
			<h2 class="font-semibold mb-2">TanStack + Telefunc Query State</h2>
			<p>Status: {debugInfo.products.status}</p>
			<p>Fetch Status: {debugInfo.products.fetchStatus}</p>
			<p>Is Pending: {debugInfo.products.isPending}</p>
			<p>Is Success: {debugInfo.products.isSuccess}</p>
			<p>Is Error: {debugInfo.products.isError}</p>
		</div>

		<div class="p-4 border rounded">
			<h2 class="font-semibold mb-2">Raw Query Object</h2>
			<pre class="text-xs bg-gray-100 p-2 rounded overflow-auto">{JSON.stringify(debugInfo, null, 2)}</pre>
		</div>

		{#if debugInfo.products.isPending}
			<div class="p-4 bg-blue-100 border border-blue-300 rounded">
				<p>🔄 Loading products via TanStack + Telefunc...</p>
			</div>
		{/if}

		{#if debugInfo.products.isError}
			<div class="p-4 bg-red-100 border border-red-300 rounded">
				<p class="font-semibold text-red-800">❌ Query Error:</p>
				<p class="text-red-700">{debugInfo.products.error}</p>
			</div>
		{/if}

		{#if debugInfo.products.isSuccess && debugInfo.products.data}
			<div class="p-4 bg-green-100 border border-green-300 rounded">
				<p class="font-semibold text-green-800">✅ TanStack + Telefunc Success!</p>
				<p class="text-green-700">Found {debugInfo.products.data.products?.length || 0} products</p>
				<p class="text-green-700">Total in DB: {debugInfo.products.data.pagination?.total || 0}</p>
				{#if debugInfo.products.data.products && debugInfo.products.data.products.length > 0}
					<div class="mt-2">
						<p class="font-medium">First product:</p>
						<pre class="text-xs bg-white p-2 rounded mt-1 max-h-32 overflow-auto">{JSON.stringify(debugInfo.products.data.products[0], null, 2)}</pre>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Mutation Testing -->
		<div class="p-4 border rounded">
			<h2 class="font-semibold mb-2">Test Mutation (TanStack + Telefunc)</h2>
			<button 
				class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
				disabled={debugInfo.createMutation.isPending}
				onclick={handleCreateTestProduct}
			>
				{debugInfo.createMutation.isPending ? '⏳ Creating...' : '➕ Create Test Product'}
			</button>
			
			{#if debugInfo.createMutation.isError}
				<p class="text-red-600 text-sm mt-2">Error: {debugInfo.createMutation.error}</p>
			{/if}
			
			{#if debugInfo.createMutation.isSuccess}
				<p class="text-green-600 text-sm mt-2">✅ Product created successfully! Query will auto-refresh.</p>
			{/if}
		</div>
	</div>
</div>
