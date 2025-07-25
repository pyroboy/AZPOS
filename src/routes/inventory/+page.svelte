<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from "$lib/components/ui/tabs";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";

	// Dynamically import tab components for code-splitting
	const tabComponents = {
		stock: () => import('$lib/components/inventory/StockStatus.svelte'),
		products: () => import('$lib/components/inventory/ProductEntry.svelte'),
		returns: () => import('$lib/components/inventory/ReturnsProcessing.svelte'),
		receiving: () => import('$lib/components/inventory/InventoryReceiving.svelte'),
		adjustments: () => import('$lib/components/inventory/InventoryAdjustment.svelte')
	};

	type Tab = keyof typeof tabComponents;

	let activeTab: Tab;

	// Sync tab with URL
	$: {
		const tabParam = $page.url.searchParams.get("tab") as Tab;
		activeTab = tabParam || "stock";
	}

	function handleTabChange(value: any) {
		// The type from the component is `string | undefined`, so we cast it.
		const newTab = value as Tab;
		activeTab = newTab;
		goto(`/inventory?tab=${newTab}`, { keepFocus: true, noScroll: true });
	}
</script>

<Toaster />
<div class="w-full">
	<Tabs value={activeTab} onValueChange={handleTabChange} class="w-full">
		<TabsList class="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 h-auto">
			<TabsTrigger value="stock">Stock</TabsTrigger>
			<TabsTrigger value="products">Products</TabsTrigger>
			<TabsTrigger value="returns">Returns</TabsTrigger>
			<TabsTrigger value="receiving">Receiving</TabsTrigger>
			<TabsTrigger value="adjustments">Adjustments</TabsTrigger>
		</TabsList>

		{#each Object.entries(tabComponents) as [tabName, componentPromise]}
			<TabsContent value={tabName} class="pt-6">
				{#if activeTab === tabName}
					{#await componentPromise() then { default: Component }}
						<svelte:component this={Component} />
					{:catch error}
						<p class="text-destructive">Error loading component: {error.message}</p>
					{/await}
				{/if}
			</TabsContent>
		{/each}
	</Tabs>
</div>