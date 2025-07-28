<script lang="ts">
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { useSuppliers } from '$lib/data/supplier';
	import type { Supplier, SupplierInput } from '$lib/types/supplier.schema';

	let {
		open = $bindable(false),
		supplier = $bindable<Supplier | null>(null)
	}: {
		open?: boolean;
		supplier?: Supplier | null;
	} = $props();

	const { createSupplier, updateSupplier, isCreating, isUpdating, createError, updateError } = useSuppliers();

	let formData: Partial<SupplierInput> = $state({});

	$effect(() => {
		if (supplier) {
			formData = { 
				name: supplier.name,
				code: supplier.code,
				email: supplier.email,
				phone: supplier.phone,
				website: supplier.website,
				tax_id: supplier.tax_id,
				payment_terms: supplier.payment_terms,
				credit_limit: supplier.credit_limit,
				currency: supplier.currency,
				is_active: supplier.is_active,
				notes: supplier.notes,
				contacts: supplier.contacts,
				addresses: supplier.addresses,
				tags: supplier.tags
			};
		} else {
			formData = { 
				name: '', 
				code: '', 
				email: '', 
				phone: '', 
				currency: 'USD',
				is_active: true
			};
		}
	});

	const isEditing = $derived(!!supplier);

	function handleSubmit() {
		if (isEditing && supplier?.id) {
			updateSupplier({ supplierId: supplier.id, supplierData: formData });
		} else {
			createSupplier(formData as SupplierInput);
		}
		open = false;
	}
</script>

<Dialog bind:open>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>{isEditing ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
			<DialogDescription>
				{isEditing ? 'Update the details for this supplier.' : 'Enter the details for the new supplier.'}
			</DialogDescription>
		</DialogHeader>

		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="name" class="text-right">Name</Label>
				<Input id="name" bind:value={formData.name} class="col-span-3" required />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="code" class="text-right">Code</Label>
				<Input id="code" bind:value={formData.code} class="col-span-3" required />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="email" class="text-right">Email</Label>
				<Input id="email" type="email" bind:value={formData.email} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="phone" class="text-right">Phone</Label>
				<Input id="phone" bind:value={formData.phone} class="col-span-3" />
			</div>
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="website" class="text-right">Website</Label>
				<Input id="website" type="url" bind:value={formData.website} class="col-span-3" />
			</div>
		</div>

		{#if createError || updateError}
			<div class="text-red-500 text-sm mb-4">
				Error: {createError?.message || updateError?.message}
			</div>
		{/if}

		<DialogFooter>
			<Button variant="outline" onclick={() => (open = false)} disabled={isCreating || isUpdating}>Cancel</Button>
			<Button onclick={handleSubmit} disabled={isCreating || isUpdating}>
				{#if isCreating || isUpdating}
					{isEditing ? 'Updating...' : 'Creating...'}
				{:else}
					{isEditing ? 'Update' : 'Create'} Supplier
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
