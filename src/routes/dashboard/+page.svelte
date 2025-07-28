<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner';
	import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { setContext } from 'svelte';

	// Stores for context
	import { inventory } from '$lib/stores/inventoryStore.svelte';
	import { settings } from '$lib/stores/settingsStore.svelte';

	// Provide stores to child components via context
	setContext('inventory', inventory);
	setContext('settings', settings);

	// Components for the Admin Dashboard
	import PricingControl from '$lib/components/inventory/PricingControl.svelte';
	import PurchaseOrderManagement from '$lib/components/inventory/PurchaseOrderManagement.svelte';
	import ReorderReport from '$lib/components/inventory/ReorderReport.svelte';

	const ALL_TABS = [
		{ key: 'pricing', label: 'Pricing' },
		{ key: 'purchase-orders', label: 'Purchase Orders' },
		{ key: 'reorder', label: 'Reorder' }
	];

	let activeTab: string;

	// Sync tab with URL
	$: {
		const tabParam = $page.url.searchParams.get('tab');
		activeTab = tabParam && ALL_TABS.some((t) => t.key === tabParam) ? tabParam : ALL_TABS[0].key;
	}

	function handleTabChange(value: any) {
		const newTab = value as string;
		activeTab = newTab;
		goto(`/dashboard?tab=${newTab}`, { keepFocus: true, noScroll: true });
	}
</script>

<Toaster />
<div class="w-full">
	<h1 class="text-2xl font-bold mb-4">Admin Dashboard</h1>
	<Tabs value={activeTab} onValueChange={handleTabChange} class="w-full">
		<TabsList>
			{#each ALL_TABS as tab}
				<TabsTrigger value={tab.key}>{tab.label}</TabsTrigger>
			{/each}
		</TabsList>

		<TabsContent value="pricing" class="pt-6">
			<PricingControl />
		</TabsContent>
		<TabsContent value="purchase-orders" class="pt-6">
			<PurchaseOrderManagement />
		</TabsContent>
		<TabsContent value="reorder" class="pt-6">
			<ReorderReport />
		</TabsContent>
	</Tabs>
</div>