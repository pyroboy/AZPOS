<script lang="ts">
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { suppliers } from '$lib/stores/supplierStore.svelte';
	import type { Supplier } from '$lib/schemas/models';

	let {
		open = $bindable(false),
		supplier = $bindable<Supplier | null>(null)
	}: {
		open?: boolean;
		supplier?: Supplier | null;
	} = $props();

	let formData: Partial<Supplier> = $state({});

	$effect(() => {
		if (supplier) {
			formData = { ...supplier };
		} else {
			formData = { name: '', contact_person: '', email: '', phone: '', address: '' };
		}
	});

	const isEditing = $derived(!!supplier);

	function handleSubmit() {
		if (isEditing && formData.id) {
			suppliers.updateSupplier(formData.id, formData as Supplier);
		} else {
			suppliers.addSupplier(formData as Supplier)
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
				<Label for="contact" class="text-right">Contact Person</Label>
				<Input id="contact" bind:value={formData.contact_person} class="col-span-3" />
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
				<Label for="address" class="text-right">Address</Label>
				<Input id="address" bind:value={formData.address} class="col-span-3" />
			</div>
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
			<Button onclick={handleSubmit}>Save</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
