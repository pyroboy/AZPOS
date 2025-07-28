<!-- StockStatus.svelte -->
<script lang="ts">
    import { inventoryManager, type ProductWithStock } from '$lib/stores/inventoryStore.svelte';
    import { setViewMode, viewMode } from '$lib/stores/viewStore.svelte';
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

    // Access inventory manager properties directly to avoid binding issues
    // Don't destructure reactive properties that need to be bound
    
    // Get categories from products (derived)
    const categories = $derived(
        [...new Set(inventoryManager.products.map(p => p.category_id).filter(Boolean))]
    );

    // Items to reorder count
    const itemsToReorderCount = $derived(
        inventoryManager.filteredProducts.filter(p => p.stock < 10).length
    );

    // Helper functions using inventory manager methods
    function toggleCategory(categoryId: string) {
        inventoryManager.toggleCategory(categoryId);
    }

    function clearFilters() {
        inventoryManager.clearFilters();
    }

    function handleBarcodeScanned(code: string) {
        inventoryManager.searchTerm = code;
    }
</script>

<div class="space-y-6">
    <!-- KPI Cards -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StockKPI />
    </div>
    
    <!-- Controls -->
    <div class="space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex flex-1 items-center gap-4">
                <div class="relative w-full max-w-sm">

                    <Input
                        class="max-w-sm"
                        placeholder="Search by name or SKU..."
                        bind:value={inventoryManager.searchTerm}
                    />
                </div>

                {#if inventoryManager.selectedProductIds.length > 0}
                    <div class="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onclick={() => inventoryManager.isBulkEditModalOpen = true}
                            disabled={inventoryManager.selectedProductIds.length === 0}
                        >
                            Edit Selected ({inventoryManager.selectedProductIds.length})
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            onclick={() => inventoryManager.selectedProductIds = []}
                        >
                            <Trash2 class="h-4 w-4" />
                        </Button>
                    </div>
                {/if}
            </div>

            <div class="flex items-center gap-2">
                                <Select.Root type="single" bind:value={inventoryManager.stockStatusFilter}>
                    <Select.Trigger class="w-[180px]">
                      {STOCK_STATUS_FILTERS.find(o => o.value === inventoryManager.stockStatusFilter)?.label ?? ''}
                    </Select.Trigger>
                    <Select.Content>
                        {#each STOCK_STATUS_FILTERS as option (option.value)}
                            <Select.Item value={option.value}>{option.label}</Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>

				<Select.Root type="single" bind:value={inventoryManager.sortOrder}>
                    <Select.Trigger class="w-[180px]">
                      {SORT_OPTIONS.find(o => o.value === inventoryManager.sortOrder)?.label ?? ''}
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
                    onclick={() =>  setViewMode('card')}
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
                        variant={inventoryManager.activeCategories.includes(category) ? 'default' : 'outline'}
                        size="sm"
                        onclick={() => toggleCategory(category)}
                    >
                        {category}
                    </Button>
                {/each}
                {#if inventoryManager.activeCategories.length > 0}
                    <Button variant="ghost" size="sm" onclick={clearFilters} class="flex items-center gap-1">
                        <X class="h-4 w-4"/>
                        Clear
                    </Button>
                {/if}
            </div>

            {#if itemsToReorderCount > 0}
                <button
                    onclick={() => goto('/inventory/reorder')}
                    class="flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1.5 text-sm font-medium text-warning-foreground transition-colors hover:bg-warning/20"
                >
                    <div class="relative flex h-3 w-3">
                        <span class="relative inline-flex h-3 w-3 rounded-full bg-warning"></span>
                    </div>
                    <span>
                        {itemsToReorderCount}
                        {itemsToReorderCount === 1 ? 'item' : 'items'} to reorder
                    </span>
                </button>
            {/if}
        </div>
    </div>

    <!-- Product Display -->
    {#if inventoryManager.filteredProducts.length > 0}
        {#if viewMode === 'card'}
            <StockCardView />
        {:else}
            <StockTableView />
        {/if}
    {:else}
        <div class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/20 p-8 text-center">
            <h3 class="text-lg font-semibold">No Products Found</h3>
            <p class="text-sm text-muted-foreground">Try adjusting your search or filter criteria.</p>
        </div>
    {/if}

    <!-- Bulk-edit modal -->
    <BulkEditModal bind:open={inventoryManager.isBulkEditModalOpen} productIds={inventoryManager.selectedProductIds} onclose={() => inventoryManager.isBulkEditModalOpen = false} />
</div>