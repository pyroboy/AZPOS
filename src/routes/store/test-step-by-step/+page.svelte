<script lang="ts">
import { createQuery } from '@tanstack/svelte-query';
import { browser } from '$app/environment';

let currentStep = $state(1);
let testResults = $state<Record<number, any>>({});

// Step 1: Minimal query with hardcoded enabled: true
const step1Query = createQuery({
	queryKey: ['step1-products'],
	queryFn: async () => {
		console.log('🧪 [STEP1] Executing with enabled: true');
		const response = await fetch('/api/products?is_active=true&limit=20');
		if (!response.ok) {
			throw new Error(`Failed to fetch: ${response.statusText}`);
		}
		return response.json();
	},
	enabled: true,
	retry: 1
});

// Step 2: Query with browser check
const step2Query = createQuery({
	queryKey: ['step2-products'],
	queryFn: async () => {
		console.log('🧪 [STEP2] Executing with enabled: browser');
		const response = await fetch('/api/products?is_active=true&limit=20');
		if (!response.ok) {
			throw new Error(`Failed to fetch: ${response.statusText}`);
		}
		return response.json();
	},
	enabled: browser,
	retry: 1
});

// Step 3: Query with complex filters (like original)
const step3Query = createQuery({
	queryKey: ['step3-products', { is_active: true }],
	queryFn: async () => {
		console.log('🧪 [STEP3] Executing with complex filters');
		const response = await fetch('/api/products?is_active=true&limit=20');
		if (!response.ok) {
			throw new Error(`Failed to fetch: ${response.statusText}`);
		}
		return response.json();
	},
	enabled: browser,
	staleTime: 1000 * 60 * 2,
	gcTime: 1000 * 60 * 10,
	retry: 3,
	retryDelay: 1000
});

// Step 4: Query using the original useProducts hook (simplified)
import { useProducts } from '$lib/data/product';
const { productsQuery: step4Query, activeProducts, isLoading, isError, error } = useProducts({
	is_active: true
});

function runStep(step: number) {
	currentStep = step;
	console.log(`🧪 [TEST] Running step ${step}`);
	
	let query;
	switch (step) {
		case 1:
			query = step1Query;
			break;
		case 2:
			query = step2Query;
			break;
		case 3:
			query = step3Query;
			break;
		case 4:
			query = step4Query;
			break;
	}
	
	if (query) {
		testResults[step] = {
			status: query.status,
			fetchStatus: query.fetchStatus,
			isPending: query.isPending,
			isSuccess: query.isSuccess,
			isError: query.isError,
			dataLength: query.data?.products?.length || 0,
			error: query.error?.toString() || null,
			timestamp: new Date().toISOString()
		};
	}
}

// Auto-run tests in sequence
$effect(() => {
	setTimeout(() => runStep(1), 100);
	setTimeout(() => runStep(2), 200);
	setTimeout(() => runStep(3), 300);
	setTimeout(() => runStep(4), 400);
});
</script>

<svelte:head>
	<title>Step-by-Step Query Test</title>
</svelte:head>

<div class="p-8">
	<h1 class="text-2xl font-bold mb-4">Step-by-Step Query Test</h1>
	
	<div class="mb-6">
		<h2 class="text-lg font-semibold mb-2">Environment</h2>
		<p>Browser: {browser}</p>
		<p>Window: {typeof window !== 'undefined'}</p>
	</div>

	<div class="space-y-6">
		<!-- Step 1: Hardcoded enabled: true -->
		<div class="p-4 border rounded">
			<h3 class="font-semibold mb-2">Step 1: Hardcoded enabled: true</h3>
			<div class="grid grid-cols-2 gap-4 text-xs">
				<div>
					<p>Status: {step1Query.status}</p>
					<p>Pending: {step1Query.isPending}</p>
					<p>Success: {step1Query.isSuccess}</p>
				</div>
				<div>
					<p>Error: {step1Query.isError}</p>
					<p>Data length: {step1Query.data?.products?.length || 0}</p>
					{#if step1Query.error}
						<p class="text-red-600">Error: {step1Query.error}</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Step 2: Browser check -->
		<div class="p-4 border rounded">
			<h3 class="font-semibold mb-2">Step 2: enabled: browser</h3>
			<div class="grid grid-cols-2 gap-4 text-xs">
				<div>
					<p>Status: {step2Query.status}</p>
					<p>Pending: {step2Query.isPending}</p>
					<p>Success: {step2Query.isSuccess}</p>
				</div>
				<div>
					<p>Error: {step2Query.isError}</p>
					<p>Data length: {step2Query.data?.products?.length || 0}</p>
					{#if step2Query.error}
						<p class="text-red-600">Error: {step2Query.error}</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Step 3: Complex configuration -->
		<div class="p-4 border rounded">
			<h3 class="font-semibold mb-2">Step 3: Complex configuration</h3>
			<div class="grid grid-cols-2 gap-4 text-xs">
				<div>
					<p>Status: {step3Query.status}</p>
					<p>Pending: {step3Query.isPending}</p>
					<p>Success: {step3Query.isSuccess}</p>
				</div>
				<div>
					<p>Error: {step3Query.isError}</p>
					<p>Data length: {step3Query.data?.products?.length || 0}</p>
					{#if step3Query.error}
						<p class="text-red-600">Error: {step3Query.error}</p>
					{/if}
				</div>
			</div>
		</div>

		<!-- Step 4: Original useProducts hook -->
		<div class="p-4 border rounded">
			<h3 class="font-semibold mb-2">Step 4: Original useProducts hook</h3>
			<div class="grid grid-cols-2 gap-4 text-xs">
				<div>
					<p>Status: {step4Query.status}</p>
					<p>Pending: {step4Query.isPending}</p>
					<p>Success: {step4Query.isSuccess}</p>
				</div>
				<div>
					<p>Error: {step4Query.isError}</p>
					<p>Data length: {step4Query.data?.products?.length || 0}</p>
					<p>Active products: {activeProducts ? activeProducts().length : 0}</p>
					{#if step4Query.error}
						<p class="text-red-600">Error: {step4Query.error}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Test Results Summary -->
	<div class="mt-8 p-4 border rounded bg-gray-50">
		<h3 class="font-semibold mb-2">Test Results Summary</h3>
		<pre class="text-xs overflow-auto">{JSON.stringify(testResults, null, 2)}</pre>
	</div>

	<!-- Manual Test Buttons -->
	<div class="mt-4 space-x-2">
		<button 
			class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
			onclick={() => runStep(1)}
		>
			Test Step 1
		</button>
		<button 
			class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
			onclick={() => runStep(2)}
		>
			Test Step 2
		</button>
		<button 
			class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
			onclick={() => runStep(3)}
		>
			Test Step 3
		</button>
		<button 
			class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
			onclick={() => runStep(4)}
		>
			Test Step 4
		</button>
	</div>
</div>
