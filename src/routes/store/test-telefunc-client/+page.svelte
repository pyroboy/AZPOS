<script lang="ts">
import { createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { onMount } from 'svelte';

let testResults = $state({
    directTelefunc: null,
    apiEndpoint: null
});

// Test 1: Direct Telefunc call (this is the proper way to use Telefunc)
const directTelefuncQuery = createQuery({
    queryKey: ['direct-telefunc-test'],
    queryFn: async () => {
        console.log('🔍 [CLIENT] Testing direct Telefunc call');
        
        // This is how Telefunc should be called from client-side
        const response = await fetch('/_telefunc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file: '/src/lib/server/telefuncs/product.telefunc.ts',
                name: 'onGetProducts',
                args: [{ is_active: true, limit: 5 }]
            })
        });

        if (!response.ok) {
            throw new Error(`Telefunc call failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ [CLIENT] Direct Telefunc call successful:', data);
        return data;
    },
    enabled: browser,
    retry: 1
});

// Test 2: API endpoint call (for comparison)
const apiEndpointQuery = createQuery({
    queryKey: ['api-endpoint-test'],
    queryFn: async () => {
        console.log('🔍 [CLIENT] Testing API endpoint call');
        
        const response = await fetch('/api/products?is_active=true&limit=5');
        if (!response.ok) {
            throw new Error(`API call failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ [CLIENT] API endpoint call successful:', data);
        return data;
    },
    enabled: browser,
    retry: 1
});

// Update test results reactively
$: {
    testResults.directTelefunc = {
        status: $directTelefuncQuery.status,
        isPending: $directTelefuncQuery.isPending,
        isSuccess: $directTelefuncQuery.isSuccess,
        isError: $directTelefuncQuery.isError,
        data: $directTelefuncQuery.data,
        error: $directTelefuncQuery.error?.message
    };

    testResults.apiEndpoint = {
        status: $apiEndpointQuery.status,
        isPending: $apiEndpointQuery.isPending,
        isSuccess: $apiEndpointQuery.isSuccess,
        isError: $apiEndpointQuery.isError,
        data: $apiEndpointQuery.data,
        error: $apiEndpointQuery.error?.message
    };
}

onMount(() => {
    console.log('🧪 [CLIENT] Telefunc client test component mounted');
});

function manualRefetch() {
    directTelefuncQuery.refetch();
    apiEndpointQuery.refetch();
}
</script>

<svelte:head>
    <title>Client-Side Telefunc Test</title>
</svelte:head>

<div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Client-Side Telefunc Test</h1>
    
    <div class="space-y-6">
        <!-- Environment Info -->
        <div class="p-4 border rounded">
            <h2 class="font-semibold mb-2">Environment Info</h2>
            <p>Browser: {browser}</p>
            <p>Window defined: {typeof window !== 'undefined'}</p>
        </div>

        <!-- Manual Refetch Button -->
        <div class="p-4 border rounded">
            <button 
                class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                onclick={manualRefetch}
            >
                🔄 Refetch Both Tests
            </button>
        </div>

        <!-- Direct Telefunc Test -->
        <div class="p-4 border rounded">
            <h2 class="font-semibold mb-2">Test 1: Direct Telefunc Call (/_telefunc endpoint)</h2>
            
            <div class="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                    <p>Status: {testResults.directTelefunc?.status || 'initializing'}</p>
                    <p>Pending: {testResults.directTelefunc?.isPending || false}</p>
                    <p>Success: {testResults.directTelefunc?.isSuccess || false}</p>
                </div>
                <div>
                    <p>Error: {testResults.directTelefunc?.isError || false}</p>
                    <p>Products: {testResults.directTelefunc?.data?.products?.length || 0}</p>
                </div>
            </div>

            {#if testResults.directTelefunc?.isPending}
                <div class="p-4 bg-blue-100 border border-blue-300 rounded">
                    <p>🔄 Testing direct Telefunc call...</p>
                </div>
            {/if}

            {#if testResults.directTelefunc?.isError}
                <div class="p-4 bg-red-100 border border-red-300 rounded">
                    <p class="font-semibold text-red-800">❌ Direct Telefunc Failed</p>
                    <p class="text-red-700">Error: {testResults.directTelefunc.error}</p>
                </div>
            {/if}

            {#if testResults.directTelefunc?.isSuccess}
                <div class="p-4 bg-green-100 border border-green-300 rounded">
                    <p class="font-semibold text-green-800">✅ Direct Telefunc Success!</p>
                    <p class="text-green-700">Products found: {testResults.directTelefunc.data?.products?.length || 0}</p>
                    
                    {#if testResults.directTelefunc.data?.products?.[0]}
                        <div class="mt-2">
                            <p class="font-medium">Sample product:</p>
                            <pre class="text-xs bg-white p-2 rounded mt-1 overflow-auto">{JSON.stringify(testResults.directTelefunc.data.products[0], null, 2)}</pre>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <!-- API Endpoint Test -->
        <div class="p-4 border rounded">
            <h2 class="font-semibold mb-2">Test 2: API Endpoint Call (/api/products)</h2>
            
            <div class="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                    <p>Status: {testResults.apiEndpoint?.status || 'initializing'}</p>
                    <p>Pending: {testResults.apiEndpoint?.isPending || false}</p>
                    <p>Success: {testResults.apiEndpoint?.isSuccess || false}</p>
                </div>
                <div>
                    <p>Error: {testResults.apiEndpoint?.isError || false}</p>
                    <p>Products: {testResults.apiEndpoint?.data?.products?.length || 0}</p>
                </div>
            </div>

            {#if testResults.apiEndpoint?.isPending}
                <div class="p-4 bg-blue-100 border border-blue-300 rounded">
                    <p>🔄 Testing API endpoint call...</p>
                </div>
            {/if}

            {#if testResults.apiEndpoint?.isError}
                <div class="p-4 bg-red-100 border border-red-300 rounded">
                    <p class="font-semibold text-red-800">❌ API Endpoint Failed</p>
                    <p class="text-red-700">Error: {testResults.apiEndpoint.error}</p>
                </div>
            {/if}

            {#if testResults.apiEndpoint?.isSuccess}
                <div class="p-4 bg-green-100 border border-green-300 rounded">
                    <p class="font-semibold text-green-800">✅ API Endpoint Success!</p>
                    <p class="text-green-700">Products found: {testResults.apiEndpoint.data?.products?.length || 0}</p>
                    
                    {#if testResults.apiEndpoint.data?.products?.[0]}
                        <div class="mt-2">
                            <p class="font-medium">Sample product:</p>
                            <pre class="text-xs bg-white p-2 rounded mt-1 overflow-auto">{JSON.stringify(testResults.apiEndpoint.data.products[0], null, 2)}</pre>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <!-- Comparison -->
        <div class="p-4 border rounded bg-yellow-50">
            <h2 class="font-semibold mb-2">Test Comparison</h2>
            <div class="text-sm space-y-2">
                <p><strong>Direct Telefunc:</strong> Calls the telefunc function directly through the /_telefunc endpoint (this proves Telefunc works)</p>
                <p><strong>API Endpoint:</strong> Calls our custom REST API that internally uses the same database queries</p>
                <p><strong>Both should return similar data</strong> but through different execution paths</p>
            </div>
        </div>

        <!-- Raw Results -->
        <div class="p-4 border rounded">
            <h2 class="font-semibold mb-2">Raw Test Results</h2>
            <pre class="text-xs bg-gray-100 p-2 rounded overflow-auto">{JSON.stringify(testResults, null, 2)}</pre>
        </div>
    </div>
</div>
