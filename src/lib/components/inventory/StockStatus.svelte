
<script lang="ts">

	import { useProducts } from '$lib/data/product';
	
	import { useInventory } from '$lib/data/inventory';
	
	import { useView } from '$lib/data/view';
	
	import { goto } from '$app/navigation';
	
	import { Button } from '$lib/components/ui/button';
	
	import StockKPI from './StockKPI.svelte';
	
	import StockCardView from './StockCardView.svelte';
	
	import StockTableView from './StockTableView.svelte';
	
	import BulkEditModal from './BulkEditModal.svelte';
	
	import * as Select from '$lib/components/ui/select';
	
	import { Input } from '$lib/components/ui/input';
	
	import { LayoutGrid, List, Trash2, X } from 'lucide-svelte';
	
	import { SORT_OPTIONS, STOCK_STATUS_FILTERS } from '$lib/constants/inventory';
	
	import type { Product } from '$lib/types/product.schema';
	
	
	
	// Local state for filters and selections
	
	let searchTerm = $state('');
	
	let stockStatusFilter = $state('all');
	
	let sortOrder = $state('name_asc');
	
	let activeCategories = $state<string[]>([]);
	
	let selectedProductIds = $state<string[]>([]);
	
	let isBulkEditModalOpen = $state(false);
	
	let viewMode = $state<'card' | 'table'>('card');
	
	
	
	// --- CORRECTED DATA FETCHING ---
	
	// Call the hooks and derive state directly from them.
	
	// This enables the client-side TanStack Query.
	
	
	// Debug: Initial filter values passed to the hook
	
	const initialFilters = undefined; // No filters passed in this component
	
	console.log('🔍 [StockStatus] Initial filter values passed to useProducts hook:', {
	
	filters: initialFilters,
	
	timestamp: new Date().toISOString(),
	
	component: 'StockStatus.svelte'
	
	});
	
	
	// Debug: Browser environment check status
	
	console.log('🌐 [StockStatus] Browser environment check:', {
	
	typeof_window: typeof window,
	
	is_browser: typeof window !== 'undefined',
	
	userAgent: typeof window !== 'undefined' ? window.navigator?.userAgent : 'N/A',
	
	location: typeof window !== 'undefined' ? window.location?.href : 'N/A',
	
	timestamp: new Date().toISOString()
	
	});
	
	
	// Debug: Query lifecycle events tracking
	
	console.log('🚀 [StockStatus] Query lifecycle - START: Calling useProducts hook', {
	
	filters: initialFilters,
	
	timestamp: new Date().toISOString(),
	
	event: 'HOOK_CALL_START'
	
	});
	
	
	const { products, isLoading, isError, error } = useProducts(initialFilters);
	
	
	// Debug: Log what the hook actually returns
	
	console.log('🔧 [StockStatus] Hook return inspection:', {
	
	timestamp: new Date().toISOString(),
	
	products,
	
	productsType: typeof products,
	
	isLoading,
	
	isLoadingType: typeof isLoading,
	
	isError,
	
	error
	
	});
	
	
	// Debug: Query lifecycle events - hook returned
	
	console.log('✨ [StockStatus] Query lifecycle - HOOK_RETURNED: useProducts hook completed', {
	
	filters: initialFilters,
	
	timestamp: new Date().toISOString(),
	
	event: 'HOOK_CALL_COMPLETE',
	
	hook_result: {
	
	has_products_fn: typeof products === 'function',
	
	has_isLoading_fn: typeof isLoading === 'function',
	
	has_isError_fn: typeof isError === 'function',
	
	has_error_fn: typeof error === 'function'
	
	}
	
	});
	
	
	const { inventoryItems } = useInventory();
	
	const { updateViewState, getFilterState, getSortState, getSelectionState } = useView();
	
	// --- END CORRECTION ---
	
	
	
	// Reactive variables for filtered data
	
	let categories: (string | undefined)[] = $state([]);
	
	let filteredProducts: Product[] = $state([]);
	
	
	
	// Use $effect to reactively update categories and filtered products
	
	$effect(() => {
	
	console.log('🔄 [StockStatus] Effect triggered - updating categories and filtered products');
	
	
	// Access stores to ensure reactivity
	
	const productsData = $products;
	
	const loadingState = $isLoading;
	
	const errorState = $isError;
	
	const errorData = $error;
	
	
	// Update categories
	
	const productList = productsData ?? [];
	
	categories = [...new Set(productList.map((p: Product) => p.category_id).filter(Boolean))];
	
	
	// Update filtered products
	
	
	// Debug: Log the actual data received from stores
	
	console.log('🔍 [StockStatus] Raw store data inspection:', {
	
	timestamp: new Date().toISOString(),
	
	productsData,
	
	productsType: typeof productsData,
	
	isArray: Array.isArray(productsData),
	
	length: productsData?.length,
	
	firstProduct: productsData?.[0],
	
	loadingState,
	
	errorState,
	
	errorData
	
	});
	
	
	// Early return if no data
	
	if (!productsData || !Array.isArray(productsData)) {
	
	console.log('⚠️ [StockStatus] No valid products data, setting empty array');
	
	filteredProducts = [];
	
	return;
	
	}
	
	
	let filtered = productsData; // Use data from the hook
	
	
	// Debug: Log initial filtered array
	
	console.log('🎯 [StockStatus] Filtering debug - Initial state:', {
	
	timestamp: new Date().toISOString(),
	
	initial_products_data: productsData,
	
	initial_filtered_length: filtered.length,
	
	filter_conditions: {
	
	search_term: searchTerm,
	
	stock_status_filter: stockStatusFilter,
	
	active_categories: activeCategories,
	
	sort_order: sortOrder
	
	}
	
	});
	
	
	
	// Search filter
	
	if (searchTerm.trim()) {
	
	const search = searchTerm.toLowerCase();
	
	filtered = filtered.filter(
	
	(p: Product) =>
	
	p.name.toLowerCase().includes(search) || p.sku.toLowerCase().includes(search)
	
	);
	
	}
	
	
	
	// Category filter
	
	if (activeCategories.length > 0) {
	
	filtered = filtered.filter(
	
	(p: Product) => p.category_id && activeCategories.includes(p.category_id)
	
	);
	
	}
	
	
	
	// Stock status filter
	
	if (stockStatusFilter !== 'all') {
	
	switch (stockStatusFilter) {
	
	case 'low_stock':
	
	filtered = filtered.filter(
	
	(p: Product) =>
	
	(p.stock_quantity || 0) > 0 &&
	
	(p.stock_quantity || 0) < (p.min_stock_level || 10)
	
	);
	
	break;
	
	case 'out_of_stock':
	
	filtered = filtered.filter((p: Product) => (p.stock_quantity || 0) === 0);
	
	break;
	
	case 'in_stock':
	
	filtered = filtered.filter((p: Product) => (p.stock_quantity || 0) > 0);
	
	break;
	
	}
	
	}
	
	
	
	// Sort products
	
	switch (sortOrder) {
	
	case 'name_asc':
	
	filtered = filtered.sort((a: Product, b: Product) => a.name.localeCompare(b.name));
	
	break;
	
	case 'name_desc':
	
	filtered = filtered.sort((a: Product, b: Product) => b.name.localeCompare(a.name));
	
	break;
	
	case 'stock_asc':
	
	filtered = filtered.sort(
	
	(a: Product, b: Product) => (a.stock_quantity || 0) - (b.stock_quantity || 0)
	
	);
	
	break;
	
	case 'stock_desc':
	
	filtered = filtered.sort(
	
	(a: Product, b: Product) => (b.stock_quantity || 0) - (a.stock_quantity || 0)
	
	);
	
	break;
	
	case 'price_asc':
	
	filtered = filtered.sort(
	
	(a: Product, b: Product) => (a.selling_price || 0) - (b.selling_price || 0)
	
	);
	
	break;
	
	case 'price_desc':
	
	filtered = filtered.sort(
	
	(a: Product, b: Product) => (b.selling_price || 0) - (a.selling_price || 0)
	
	);
	
	break;
	
	}
	
	
	
	// Assign the filtered results to the state variable
	
	filteredProducts = filtered;
	
	});
	
	
	
	// Items to reorder count (derived from filteredProducts)
	
	const itemsToReorderCount = $derived(() => {
	
	return filteredProducts.filter((p: Product) => (p.stock_quantity || 0) < (p.min_stock_level || 10))
	
	.length;
	
	});
	
	
	
	// Helper functions
	
	function toggleCategory(categoryId: string) {
	
	if (activeCategories.includes(categoryId)) {
	
	activeCategories = activeCategories.filter((id) => id !== categoryId);
	
	} else {
	
	activeCategories = [...activeCategories, categoryId];
	
	}
	
	}
	
	
	
	function clearFilters() {
	
	searchTerm = '';
	
	stockStatusFilter = 'all';
	
	activeCategories = [];
	
	selectedProductIds = [];
	
	}
	
	
	
	function setViewMode(mode: 'card' | 'table') {
	
	viewMode = mode;
	
	}
	
	</script>
	
	
	
	<div class="space-y-6">
	
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
	
	<StockKPI />
	
	</div>
	
	
	
	<div class="space-y-4">
	
	<div class="flex flex-wrap items-center justify-between gap-4">
	
	<div class="flex flex-1 items-center gap-4">
	
	<div class="relative w-full max-w-sm">
	
	<Input class="max-w-sm" placeholder="Search by name or SKU..." bind:value={searchTerm} />
	
	</div>
	
	
	
	{#if selectedProductIds.length > 0}
	
	<div class="flex items-center gap-2">
	
	<Button
	
	variant="outline"
	
	onclick={() => (isBulkEditModalOpen = true)}
	
	disabled={selectedProductIds.length === 0}
	
	>
	
	Edit Selected ({selectedProductIds.length})
	
	</Button>
	
	<Button variant="secondary" size="icon" onclick={() => (selectedProductIds = [])}>
	
	<Trash2 class="h-4 w-4" />
	
	</Button>
	
	</div>
	
	{/if}
	
	</div>
	
	
	
	<div class="flex items-center gap-2">
	
	<Select.Root type="single" bind:value={stockStatusFilter}>
	
	<Select.Trigger class="w-[180px]">
	
	{STOCK_STATUS_FILTERS.find((o) => o.value === stockStatusFilter)?.label ?? ''}
	
	</Select.Trigger>
	
	<Select.Content>
	
	{#each STOCK_STATUS_FILTERS as option (option.value)}
	
	<Select.Item value={option.value}>{option.label}</Select.Item>
	
	{/each}
	
	</Select.Content>
	
	</Select.Root>
	
	
	
	<Select.Root type="single" bind:value={sortOrder}>
	
	<Select.Trigger class="w-[180px]">
	
	{SORT_OPTIONS.find((o) => o.value === sortOrder)?.label ?? ''}
	
	</Select.Trigger>
	
	<Select.Content>
	
	{#each SORT_OPTIONS as option (option.value)}
	
	<Select.Item value={option.value}>{option.label}</Select.Item>
	
	{/each}
	
	</Select.Content>
	
	</Select.Root>
	
	
	
	<Button
	
	variant={viewMode === 'card' ? 'default' : 'outline'}
	
	size="icon"
	
	onclick={() => setViewMode('card')}
	
	>
	
	<LayoutGrid class="h-4 w-4" />
	
	</Button>
	
	<Button
	
	variant={viewMode === 'table' ? 'default' : 'outline'}
	
	size="icon"
	
	onclick={() => setViewMode('table')}
	
	>
	
	<List class="h-4 w-4" />
	
	</Button>
	
	</div>
	
	</div>
	
	
	
	<div class="flex flex-wrap items-center justify-between gap-2">
	
	<div class="flex items-center gap-2 flex-wrap">
	
	<p class="text-sm font-medium">Categories:</p>
	
	{#each categories as category}
	
	<Button
	
	variant={activeCategories.includes(category as string) ? 'default' : 'outline'}
	
	size="sm"
	
	onclick={() => toggleCategory(category as string)}
	
	>
	
	{category}
	
	</Button>
	
	{/each}
	
	{#if activeCategories.length > 0}
	
	<Button variant="ghost" size="sm" onclick={clearFilters} class="flex items-center gap-1">
	
	<X class="h-4 w-4" />
	
	Clear
	
	</Button>
	
	{/if}
	
	</div>
	
	
	
	{#if itemsToReorderCount() > 0}
	
	<button
	
	onclick={() => goto('/inventory/reorder')}
	
	class="flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1.5 text-sm font-medium text-warning-foreground transition-colors hover:bg-warning/20"
	
	>
	
	<div class="relative flex h-3 w-3">
	
	<span class="relative inline-flex h-3 w-3 rounded-full bg-warning"></span>
	
	</div>
	
	<span>
	
	{itemsToReorderCount()}
	
	{itemsToReorderCount() === 1 ? 'item' : 'items'} to reorder
	
	</span>
	
	</button>
	
	{/if}
	
	</div>
	
	</div>
	
	
	
	{#if $isLoading}
	
	<div
	
	class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/20 p-8 text-center"
	
	>
	
	<h3 class="text-lg font-semibold">Loading Products...</h3>
	
	<p class="text-sm text-muted-foreground">Please wait while we load your inventory.</p>
	
	</div>
	
	{:else if $isError}
	
	<div
	
	class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-destructive/50 bg-destructive/5 p-8 text-center text-destructive"
	
	>
	
	<h3 class="text-lg font-semibold">Error Loading Products</h3>
	
	<p class="text-sm">{$error?.message}</p>
	
	</div>
	
	{:else if filteredProducts.length > 0}
	
	{#if viewMode === 'card'}
	
	<StockCardView products={filteredProducts} bind:selectedProductIds />
	
	{:else}
	
	<StockTableView products={filteredProducts} bind:selectedProductIds />
	
	{/if}
	
	{:else}
	
	<div
	
	class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/20 p-8 text-center"
	
	>
	
	<h3 class="text-lg font-semibold">No Products Found</h3>
	
	<p class="text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
	
	</div>
	
	{/if}
	
	
	
	<BulkEditModal
	
	bind:open={isBulkEditModalOpen}
	
	productIds={selectedProductIds}
	
	onClose={() => (isBulkEditModalOpen = false)}
	
	/>
	
	</div>