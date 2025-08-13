<script lang="ts">
    import { getProducts } from '$lib/remote/products.remote';
    import { getInventoryItems } from '$lib/remote/inventory.remote';
	// import { useView } from '$lib/data/view'; // Temporarily disabled
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

    // Accept shared queries from parent
    let { queries }: { queries?: any } = $props();

    // Use shared queries if provided, otherwise create new ones (fallback)
    const productsQuery = queries?.products || getProducts({});
    const inventoryQuery = queries?.inventory || getInventoryItems({});

    console.log('🔍 [StockStatus] Using data fetching', {
        usingSharedQueries: !!queries,
        timestamp: new Date().toISOString(),
        component: 'StockStatus.svelte'
    });
    
    // const { updateViewState, getFilterState, getSortState, getSelectionState } = useView(); // Temporarily disabled
    // Mock functions
    const updateViewState = () => {};
    const getFilterState = () => ({});
    const getSortState = () => ({});
    const getSelectionState = () => ({});

    // --- END REMOTE FUNCTIONS ---

    // Categories will be computed in template

    // Function to filter and sort products
    function filterAndSortProducts(products: Product[] | null | undefined) {
        if (!products || !Array.isArray(products)) {
            console.log('🔄 [StockStatus] No products or invalid data', { products });
            return [];
        }
        
        console.log('🔄 [StockStatus] Filtering and sorting products', { products: products.length });

        let filtered = products;

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
                            (p.stock_quantity || 0) > 0 && (p.stock_quantity || 0) < (p.reorder_point || p.min_stock_level || 10)
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

        return filtered;
    }

    // Reactive calculation for items to reorder count
    function getItemsToReorderCount(products: Product[]) {
        return products.filter(
            (p: Product) => (p.stock_quantity || 0) < (p.reorder_point || p.min_stock_level || 10)
        ).length;
    }

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
            {#await productsQuery then productsData}
                {@const products = productsData?.products ?? []}
                {@const uniqueCategories = products
                    .filter((p: any) => p.category && p.category.name)
                    .reduce((acc: any[], p: any) => {
                        if (!acc.some((c: any) => c.id === p.category.id)) {
                            acc.push(p.category);
                        }
                        return acc;
                    }, [])}
                <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-sm font-medium">Categories:</p>

                    {#each uniqueCategories as category}
                        <Button
                            variant={activeCategories.includes(category.id) ? 'default' : 'outline'}
                            size="sm"
                            onclick={() => toggleCategory(category.id)}
                        >
                            {category.name}
                        </Button>
                    {/each}

                    {#if activeCategories.length > 0}
                        <Button variant="ghost" size="sm" onclick={clearFilters} class="flex items-center gap-1">
                            <X class="h-4 w-4" />
                            Clear
                        </Button>
                    {/if}
                </div>
            {/await}

            {#await productsQuery then productsData}
                {@const products = productsData?.products ?? []}
                {@const reorderCount = getItemsToReorderCount(products)}
                {#if reorderCount > 0}
                    <button
                        onclick={() => goto('/inventory/reorder')}
                        class="flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1.5 text-sm font-medium text-warning-foreground transition-colors hover:bg-warning/20"
                    >
                        <div class="relative flex h-3 w-3">
                            <span class="relative inline-flex h-3 w-3 rounded-full bg-warning"></span>
                        </div>

                        <span>
                            {reorderCount}
                            {reorderCount === 1 ? 'item' : 'items'} to reorder
                        </span>
                    </button>
                {/if}
            {/await}
        </div>
    </div>

    {#await productsQuery}
        <div
            class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/20 p-8 text-center pt-0 mt-0"
        >
            <h3 class="text-lg font-semibold">Loading Products...</h3>
            <p class="text-sm text-muted-foreground">Please wait while we load your inventory.</p>
        </div>
    {:then productsData}
        {@const products = productsData?.products ?? []}
        {@const filteredProducts = filterAndSortProducts(products)}
        
        {#if filteredProducts.length > 0}
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
    {:catch error}
        <div
            class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-destructive/50 bg-destructive/5 p-8 text-center text-destructive"
        >
            <h3 class="text-lg font-semibold">Error Loading Products</h3>
            <p class="text-sm">{error?.message}</p>
        </div>
    {/await}

    <BulkEditModal
        bind:open={isBulkEditModalOpen}
        productIds={selectedProductIds}
        onClose={() => (isBulkEditModalOpen = false)}
    />
</div>
