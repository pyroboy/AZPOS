<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { User, Phone } from 'lucide-svelte';

	export let open: boolean = false;
	export let onSave: (details: { name: string; phone: string; loyaltyId: string }) => void;
	export let onCancel: () => void;

	let customerName: string = '';
	let customerPhone: string = '';
	let loyaltyId: string = '';

	function handleSave() {
		onSave({
			name: customerName,
			phone: customerPhone,
			loyaltyId: loyaltyId
		});
		reset();
	}

	function handleCancel() {
		onCancel();
		reset();
	}

	function reset() {
		customerName = '';
		customerPhone = '';
		loyaltyId = '';
	}

	// When the dialog is closed from the outside, ensure we reset the state.
	$: if (!open) {
		reset();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Customer Information</Dialog.Title>
			<Dialog.Description>Optional: Add customer details for the transaction.</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid items-center gap-2">
				<Label for="name">Name</Label>
				<div class="relative">
					<User class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input id="name" bind:value={customerName} class="pl-8" placeholder="Juan Dela Cruz" />
				</div>
			</div>
			<div class="grid items-center gap-2">
				<Label for="phone">Phone</Label>
				<div class="relative">
					<Phone class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input id="phone" bind:value={customerPhone} class="pl-8" placeholder="0917..." />
				</div>
			</div>
			<div class="grid items-center gap-2">
				<Label for="loyalty">Loyalty ID</Label>
				<Input id="loyalty" bind:value={loyaltyId} placeholder="Optional loyalty card number" />
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={handleCancel}>Skip</Button>
			<Button onclick={handleSave}>Save Customer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
