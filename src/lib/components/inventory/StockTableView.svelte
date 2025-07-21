<script lang="ts">
    import type { ProductWithStock } from '$lib/stores/inventoryStore';
	import { inventory } from '$lib/stores/inventoryStore';
	import { products } from '$lib/stores/productStore';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';
	import { Pencil, Check, X } from 'lucide-svelte';

    // Local state for selection and editing
    let selectedProductIds = $state<string[]>([]);
    let editingCell = $state<{ productId: string; field: 'stock' | 'price' } | null>(null);
    let editValue = $state<string | number>('');

    const areAllVisibleRowsSelected = $derived(
        $inventory.length > 0 && selectedProductIds.length === $inventory.length
    );

    function toggleSelectAll() {
        if (areAllVisibleRowsSelected) {
            selectedProductIds = [];
        } else {
            selectedProductIds = $inventory.map(p => p.id);
        }
    }

    function handleRowSelect(productId: string) {
        if (selectedProductIds.includes(productId)) {
            selectedProductIds = selectedProductIds.filter(id => id !== productId);
        } else {
            selectedProductIds = [...selectedProductIds, productId];
        }
    }

    function startEditing(productId: string, field: 'stock' | 'price', currentValue: number) {
        editingCell = { productId, field };
        editValue = currentValue;
    }

    function cancelEdit() {
        editingCell = null;
        editValue = '';
    }

    function saveEdit() {
        if (!editingCell) return;

        const { productId, field } = editingCell;
        const productToUpdate = $inventory.find(p => p.id === productId);
        if (!productToUpdate) return;

        const numericValue = parseFloat(editValue as string);

        if (!isNaN(numericValue)) {
            const updatedProduct = { ...productToUpdate, [field]: numericValue };
            products.updateProduct(productId, updatedProduct);
        }

        cancelEdit();
    }

	function handleEditKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') saveEdit();
		if (e.key === 'Escape') cancelEdit();
	}

	function getStockBadgeColor(stock: number) {
		if (stock === 0) return 'destructive';
		if (stock < 20) return 'secondary'; // Assuming 20 is a reorder point
		return 'outline';
	}
</script>

  <Table.Root class="rounded-lg border bg-card text-card-foreground shadow-sm">
            <Table.Header>
              <Table.Row>
                <Table.Head class="w-[60px]">
                  <Checkbox
                    checked={areAllVisibleRowsSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all rows"
                  />
                </Table.Head>
                <Table.Head class="w-[80px]">Image</Table.Head>
                <Table.Head>Name</Table.Head>
                <Table.Head>SKU</Table.Head>
                <Table.Head>Category</Table.Head>
                <Table.Head class="text-right">Stock</Table.Head>
                <Table.Head class="text-right">Price</Table.Head>
                <Table.Head class="w-[100px] text-center">Actions</Table.Head>
              </Table.Row>
            </Table.Header>
  
            <Table.Body>
              {#each $inventory as product (product.id)}
                <Table.Row data-state={selectedProductIds.includes(product.id) ? 'selected' : 'none'}>
                  <Table.Cell>
                    <Checkbox
                      checked={selectedProductIds.includes(product.id)}
                      onCheckedChange={() => handleRowSelect(product.id)}
                      aria-label={`Select row for ${product.name}`}
                    />
                  </Table.Cell>
                  <Table.Cell>
                    <img src={product.image_url} alt={product.name} class="h-10 w-10 object-cover rounded-md" />
                  </Table.Cell>
                  <Table.Cell class="font-medium">{product.name}</Table.Cell>
                  <Table.Cell>{product.sku}</Table.Cell>
                                    <Table.Cell>{product.category_id}</Table.Cell>
                  <Table.Cell class="text-right">
                    {#if editingCell?.productId === product.id && editingCell?.field === 'stock'}
                      <Input
                        type="number"
                        bind:value={editValue}
                        onkeydown={handleEditKeyDown}
                        class="h-8 w-20 text-right"
                        autofocus
                      />
                    {:else}
                      <div 
                        role="button" 
                        tabindex="0" 
                        onclick={() => startEditing(product.id, 'stock', product.stock)}
                        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') startEditing(product.id, 'stock', product.stock)}}
                        class="cursor-pointer p-2">
                        {product.stock}
                      </div>
                    {/if}
                  </Table.Cell>
                  <Table.Cell class="text-right">
                     {#if editingCell?.productId === product.id && editingCell?.field === 'price'}
                      <Input
                        type="number"
                        bind:value={editValue}
                        onkeydown={handleEditKeyDown}
                        class="h-8 w-24 text-right"
                        autofocus
                      />
                    {:else}
                      <div 
                        role="button" 
                        tabindex="0" 
                        onclick={() => startEditing(product.id, 'price', product.price)}
                        onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') startEditing(product.id, 'price', product.price)}}
                        class="cursor-pointer p-2">
                        ${product.price.toFixed(2)}
                      </div>
                    {/if}
                  </Table.Cell>
                  <Table.Cell class="text-center">
                    {#if editingCell?.productId === product.id}
                        <div class="flex justify-center items-center gap-1">
                            <Button variant="ghost" size="icon" onclick={saveEdit} class="h-7 w-7">
                                <Check class="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onclick={cancelEdit} class="h-7 w-7">
                                <X class="h-4 w-4" />
                            </Button>
                        </div>
                    {:else}
                        <!-- Intentionally blank for now, or add a generic edit button -->
                    {/if}
                  </Table.Cell>
                </Table.Row>
              {/each}
            </Table.Body>
          </Table.Root>

