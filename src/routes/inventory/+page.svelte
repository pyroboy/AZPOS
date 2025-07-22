<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from "$lib/components/ui/tabs";
	import { page } from "$app/stores";
	import { goto } from "$app/navigation";

	// Placeholder components for each tab
	// We will create these files next.
	import StockStatus from '$lib/components/inventory/StockStatus.svelte';
	import ProductEntry from "$lib/components/inventory/ProductEntry.svelte";
	import ReturnsProcessing from '$lib/components/inventory/ReturnsProcessing.svelte';
	import InventoryReceiving from "$lib/components/inventory/InventoryReceiving.svelte";
	import InventoryAdjustment from "$lib/components/inventory/InventoryAdjustment.svelte";

	type Tab = "stock" | "products" | "returns" | "receiving" | "adjustments";

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

		<TabsContent value="stock" class="pt-6">
			<StockStatus />
		</TabsContent>
		<TabsContent value="products" class="pt-6">
			<ProductEntry />
		</TabsContent>
		<TabsContent value="returns" class="pt-6">
			<ReturnsProcessing />
		</TabsContent>
		<TabsContent value="receiving" class="pt-6">
			<InventoryReceiving />
		</TabsContent>
		<TabsContent value="adjustments" class="pt-6">
			<InventoryAdjustment />
		</TabsContent>
	</Tabs>
</div>