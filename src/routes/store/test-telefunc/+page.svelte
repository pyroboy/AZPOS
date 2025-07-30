<script lang="ts">
import type { PageData } from './$types';
import { createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';

const { data } = $props<{ data: PageData }>();

console.log('🧪 [CLIENT] Initial data received:', data.initialData);
console.log('🧪 [CLIENT] Telefunc info:', data.telefuncInfo);

// Now test Telefunc from client-side (the correct way)
const clientTelefuncQuery = createQuery({
    queryKey: ['client-telefunc-test'],
    queryFn: async () => {
        console.log('🔍 [CLIENT] Testing Telefunc from client-side');
        
        // This is the correct way to use Telefunc - from client-side
        const response = await fetch('/_telefunc', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                file: '/src/lib/server/telefuncs/product.telefunc.ts',
                name: 'onGetProducts',
                args: [{ is_active: true, limit: 3 }]
            })
        });

        if (!response.ok) {
            throw new Error(`Telefunc call failed: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ [CLIENT] Telefunc call successful:', result);
        return result;
    },
    enabled: browser,
    retry: 1
});
</script>

<svelte:head>
    <title>Telefunc Test Page</title>
</svelte:head>

<div class="p-8">
    <h1 class="text-2xl font-bold mb-4">Telefunc Test Page</h1>
    
    <div class="space-y-4">
        <!-- Initial Data Results (Correct Pattern) -->
        <div class="p-4 border rounded">
            <h2 class="font-semibold mb-2">Initial Page Data (Correct Pattern - NOT using Telefunc)</h2>
            
            {#if data.initialData.success}
                <div class="p-4 bg-green-100 border border-green-300 rounded">
                    <p class="font-semibold text-green-800">✅ Initial Data Success!</p>
                    <p class="text-green-700">Products found: {data.initialData.productsCount}</p>
                    <p class="text-green-700">Timestamp: {data.initialData.timestamp}</p>
                    
                    {#if data.initialData.data?.products && data.initialData.data.products.length > 0}
                        <div class="mt-2">
                            <p class="font-medium">Sample product:</p>
                            <pre class="text-xs bg-white p-2 rounded mt-1 overflow-auto">{JSON.stringify(data.initialData.data.products[0], null, 2)}</pre>
                        </div>
                    {/if}
                </div>
            {:else}
                <div class="p-4 bg-red-100 border border-red-300 rounded">
                    <p class="font-semibold text-red-800">❌ Initial Data Failed</p>
                    <p class="text-red-700">Error: {data.initialData.error}</p>
                    <p class="text-red-700">Timestamp: {data.initialData.timestamp}</p>
                </div>
            {/if}
        </div>

        <!-- Client-Side Telefunc Test (Correct Usage) -->
        <div class="p-4 border rounded">
            <h2 class="font-semibold mb-2">Client-Side Telefunc Test (Correct Usage)</h2>
            
            <div class="grid grid-cols-2 gap-4 text-sm mb-4">
                <div>
                    <p>Status: {$clientTelefuncQuery.status}</p>
                    <p>Pending: {$clientTelefuncQuery.isPending}</p>
                    <p>Success: {$clientTelefuncQuery.isSuccess}</p>
                </div>
                <div>
                    <p>Error: {$clientTelefuncQuery.isError}</p>
                    <p>Products: {$clientTelefuncQuery.data?.ret?.products?.length || 0}</p>
                </div>
            </div>

            {#if $clientTelefuncQuery.isPending}
                <div class="p-4 bg-blue-100 border border-blue-300 rounded">
                    <p>🔄 Testing client-side Telefunc call...</p>
                </div>
            {/if}

            {#if $clientTelefuncQuery.isError}
                <div class="p-4 bg-red-100 border border-red-300 rounded">
                    <p class="font-semibold text-red-800">❌ Client Telefunc Failed</p>
                    <p class="text-red-700">Error: {$clientTelefuncQuery.error?.message}</p>
                </div>
            {/if}

            {#if $clientTelefuncQuery.isSuccess}
                <div class="p-4 bg-green-100 border border-green-300 rounded">
                    <p class="font-semibold text-green-800">✅ Client Telefunc Success!</p>
                    <p class="text-green-700">Products found: {$clientTelefuncQuery.data?.ret?.products?.length || 0}</p>
                    <p class="text-green-700">Total in DB: {$clientTelefuncQuery.data?.ret?.pagination?.total || 0}</p>
                    
                    {#if $clientTelefuncQuery.data?.ret?.products?.[0]}
                        <div class="mt-2">
                            <p class="font-medium">Sample product:</p>
                            <pre class="text-xs bg-white p-2 rounded mt-1 overflow-auto">{JSON.stringify($clientTelefuncQuery.data.ret.products[0], null, 2)}</pre>
                        </div>
                    {/if}
                </div>
            {/if}
        </div>

        <!-- Telefunc Usage Info -->
        <div class="p-4 border rounded bg-yellow-50">
            <h2 class="font-semibold mb-2">Telefunc Usage Pattern</h2>
            <div class="text-sm space-y-2">
                <p><strong>Message:</strong> {data.telefuncInfo.message}</p>
                <p><strong>Recommended Pattern:</strong> {data.telefuncInfo.recommendedPattern}</p>
                <p><strong>Telefunc Usage:</strong> {data.telefuncInfo.telefuncUsage}</p>
            </div>
        </div>

        <div class="p-4 border rounded">
            <h2 class="font-semibold mb-2">Raw Test Data</h2>
            <div class="space-y-2">
                <div>
                    <p class="font-medium text-sm">Initial Data:</p>
                    <pre class="text-xs bg-gray-100 p-2 rounded overflow-auto">{JSON.stringify(data.initialData, null, 2)}</pre>
                </div>
                <div>
                    <p class="font-medium text-sm">Client Telefunc Query:</p>
                    <pre class="text-xs bg-gray-100 p-2 rounded overflow-auto">{JSON.stringify({
                        status: $clientTelefuncQuery.status,
                        data: $clientTelefuncQuery.data,
                        error: $clientTelefuncQuery.error?.message
                    }, null, 2)}</pre>
                </div>
            </div>
        </div>

        <div class="p-4 border rounded bg-blue-50">
            <h2 class="font-semibold mb-2">What This Test Proves</h2>
            <ul class="text-sm space-y-1">
                <li>• <strong>Proper Initial Data:</strong> Uses direct database calls for SSR (correct pattern)</li>
                <li>• <strong>Client-side Telefunc:</strong> Tests Telefunc from client-side (correct usage)</li>
                <li>• <strong>Authentication:</strong> Both approaches respect user authentication</li>
                <li>• <strong>Database connectivity:</strong> Both can query the database successfully</li>
                <li>• <strong>Framework integration:</strong> Shows proper SvelteKit + Telefunc integration</li>
            </ul>
        </div>
    </div>
</div>
