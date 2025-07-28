<!-- StockStatus.svelte -->
<script lang="ts">
    import { inventory, inventoryManager, type ProductWithStock } from '$lib/stores/inventoryStore';
    import { viewMode } from '$lib/stores/viewStore';
    import { goto } from '$app/navigation';
    import { Button } from '$lib/components/ui/button';
    import BarcodeInput from '$lib/components/inventory/BarcodeInput.svelte';
    import StockKPI from './StockKPI.svelte';
    import StockCardView from './StockCardView.svelte';
    import StockTableView from './StockTableView.svelte';
    import BulkEditModal from './BulkEditModal.svelte';
    import * as Select from '$lib/components/ui/select';
    import { Input } from '$lib/components/ui/input';
    import { LayoutGrid, List, Trash2, X } from 'lucide-svelte';
    import { SORT_OPTIONS, STOCK_STATUS_FILTERS } from '$lib/constants/inventory';

    // Use the new Svelte 5 reactive inventory system
    let searchTerm = $state('');
    let selectedCategories = $state<string[]>([]);
    let selectedProducts = $state<Set<string>>(new Set());
    let isBulkEditModalOpen = $state(false);

    // Reactive filtered products
    const products = $derived.by(() => {
        return inventory.filter((product: ProductWithStock) => {
            const matchesSearch = !searchTerm || 
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.sku.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCategory = selectedCategories.length === 0 || 
                selectedCategories.includes(product.category_id);

            return matchesSearch && matchesCategory && !product.is_archived;
        });
    });

    // Calculate totals
    const totals = $derived({
        totalProducts: products.length,
        totalValue: products.reduce((sum, p) => sum + (p.stock * p.price), 0),
        lowStockCount: products.filter(p => p.stock < 10).length,
        outOfStockCount: products.filter(p => p.stock === 0).length
    });

    // Items to reorder count
    const itemsToReorderCount = $derived(
        products.filter(p => p.stock < 10).length
    );

    // Helper functions
    function toggleCategory(categoryId: string) {
        if (selectedCategories.includes(categoryId)) {
            selectedCategories = selectedCategories.filter(id => id !== categoryId);
        } else {
            selectedCategories = [...selectedCategories, categoryId];
        }
    }

    function clearFilters() {
        searchTerm = '';
        selectedCategories = [];
        selectedProducts = new Set();
    }

    function toggleSelectAll() {
        if (selectedProducts.size === products.length) {
            selectedProducts = new Set();
        } else {
            selectedProducts = new Set(products.map(p => p.id));
        }
    }

    function handleRowSelect(productId: string) {
        const newSelection = new Set(selectedProducts);
        if (newSelection.has(productId)) {
            newSelection.delete(productId);
        } else {
            newSelection.add(productId);
        }
        selectedProducts = newSelection;
    }
    const { editingCell, editValue } = editing;

    function handleBarcodeScanned(code: string) {
        $searchTerm = code;
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
                        bind:value={$searchTerm}
                    />
                </div>

                {#if $selectedProductIds.length > 0}
                    <div class="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onclick={() => $isBulkEditModalOpen = true}
                            disabled={$selectedProductIds.length === 0}
                        >
                            Edit Selected ({$selectedProductIds.length})
                        </Button>
                        <Button
                            variant="secondary"
                            size="icon"
                            onclick={() => $selectedProductIds = []}
                        >
                            <Trash2 class="h-4 w-4" />
                        </Button>
                    </div>
                {/if}
            </div>

            <div class="flex items-center gap-2">
                                <Select.Root type="single" bind:value={$stockStatusFilter}>
                    <Select.Trigger class="w-[180px]">
                      {STOCK_STATUS_FILTERS.find(o => o.value === $stockStatusFilter)?.label ?? ''}
                    </Select.Trigger>
                    <Select.Content>
                        {#each STOCK_STATUS_FILTERS as option (option.value)}
                            <Select.Item value={option.value}>{option.label}</Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>

				<Select.Root type="single" bind:value={$sortOrder}>
                    <Select.Trigger class="w-[180px]">
                      {SORT_OPTIONS.find(o => o.value === $sortOrder)?.label ?? ''}
                    </Select.Trigger>
                    <Select.Content>
                        {#each SORT_OPTIONS as option (option.value)}
                            <Select.Item value={option.value}>{option.label}</Select.Item>
                        {/each}
                    </Select.Content>
                </Select.Root>

                <Button
                    variant={$viewMode === 'card' ? 'default' : 'outline'}
                    size="icon"
                    onclick={() => $viewMode = 'card'}
                >
                    <LayoutGrid class="h-4 w-4" />
                </Button>
                <Button
                    variant={$viewMode === 'table' ? 'default' : 'outline'}
                    size="icon"
                    onclick={() => $viewMode = 'table'}
                >
                    <List class="h-4 w-4" />
                </Button>

            </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2 flex-wrap"> 
                <p class="text-sm font-medium">Categories:</p>
                {#each $categories as category}
                    <Button 
                        variant={$activeCategories.includes(category) ? 'default' : 'outline'}
                        size="sm"
                        onclick={() => toggleCategory(category)}
                    >
                        {category}
                    </Button>
                {/each}
                {#if $activeCategories.length > 0}
                    <Button variant="ghost" size="sm" onclick={clearFilters} class="flex items-center gap-1">
                        <X class="h-4 w-4"/>
                        Clear
                    </Button>
                {/if}
            </div>

            {#if $itemsToReorderCount > 0}
                <button
                    onclick={() => goto('/inventory/reorder')}
                    class="flex items-center gap-2 rounded-full bg-warning/10 px-3 py-1.5 text-sm font-medium text-warning-foreground transition-colors hover:bg-warning/20"
                >
                    <div class="relative flex h-3 w-3">
                        <span class="relative inline-flex h-3 w-3 rounded-full bg-warning"></span>
                    </div>
                    <span>
                        {$itemsToReorderCount}
                        {$itemsToReorderCount === 1 ? 'item' : 'items'} to reorder
                    </span>
                </button>
            {/if}
        </div>
    </div>

    <!-- Product Display -->
    {#if $products.length > 0}
        {#if $viewMode === 'card'}
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
    <BulkEditModal bind:open={$isBulkEditModalOpen} productIds={$selectedProductIds} onclose={() => $isBulkEditModalOpen = false} />
</div>