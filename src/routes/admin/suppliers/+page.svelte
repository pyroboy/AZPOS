<script lang="ts">
	import { suppliers } from '$lib/stores/supplierStore.svelte';
	import { products } from '$lib/stores/productStore.svelte';
	import { Button } from '$lib/components/ui/button';
	import { PlusCircle } from 'lucide-svelte';
	import SupplierTable from '$lib/components/suppliers/SupplierTable.svelte';
	import SupplierDialog from '$lib/components/suppliers/SupplierDialog.svelte';
	import type { PurchaseOrder, Supplier } from '$lib/schemas/models';


	let dialogOpen = $state(false);
	let selectedSupplier = $state<Supplier | null>(null);

	function handleAddSupplier() {
		selectedSupplier = null;
		dialogOpen = true;
	}

	function handleEditSupplier(event: CustomEvent<Supplier>) {
		selectedSupplier = event.detail;
		dialogOpen = true;
	}
</script>

<div class="p-4 sm:p-6">
    <header class="flex items-center justify-between mb-6">
        <div>
            <h1 class="text-2xl font-bold">Supplier Management</h1>
            <p class="text-muted-foreground">Add, edit, and manage your product suppliers.</p>
        </div>
        <Button onclick={handleAddSupplier}>
            <PlusCircle class="mr-2 h-4 w-4" />
            Add New Supplier
        </Button>
    </header>

    <SupplierTable on:edit={handleEditSupplier} />

    <SupplierDialog bind:open={dialogOpen} bind:supplier={selectedSupplier} />
</div>

<!-- TODO: SupplierDialog component will go here -->
