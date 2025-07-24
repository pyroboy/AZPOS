<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { DollarSign, QrCode, User } from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import CustomerInputModal from './CustomerInputModal.svelte';

	export let open: boolean;
	export let totalAmount: number;

	export let onConfirm: (
		details: {
			paymentMethod: 'cash' | 'gcash';
			cashTendered: number | undefined;
			gcashReference: string;
			customerName: string;
			printReceipt: boolean;
			total: number;
			change: number;
		}
	) => void;
	export let onCancel: () => void;

	let paymentMethod: 'cash' | 'gcash' = 'cash';
	let cashTendered: number | undefined = undefined;
	let gcashReference: string = '';
	let customerName: string = '';
	let printReceipt: boolean = true;
	let showCustomerModal: boolean = false;



	$: change =
		paymentMethod === 'cash' && cashTendered && cashTendered >= totalAmount
			? cashTendered - totalAmount
			: 0;

	$: isValid =
		(paymentMethod === 'cash' && cashTendered && cashTendered >= totalAmount) ||
		(paymentMethod === 'gcash' && gcashReference.trim() !== '');

	function handleConfirm() {
		if (!isValid) return;

		onConfirm({
			paymentMethod,
			cashTendered,
			gcashReference,
			customerName,
			printReceipt,
			total: totalAmount,
			change
		});
		resetForm();
	}

	function handleCancel() {
		onCancel();
		resetForm();
	}



	function resetForm() {
		paymentMethod = 'cash';
		cashTendered = undefined;
		gcashReference = '';
		customerName = '';
		printReceipt = true;
	}

	// When the dialog is closed from the outside, ensure we reset the state.
	$: if (!open) {
		resetForm();
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[480px]">
		<Dialog.Header>
			<Dialog.Title class="text-2xl font-bold">Payment</Dialog.Title>
			<Dialog.Description>
				Total Amount: <span class="font-bold text-lg text-primary">₱{totalAmount.toFixed(2)}</span>
			</Dialog.Description>
		</Dialog.Header>

		<div class="grid gap-6 py-4">
			<!-- Payment Method Selection -->
			<div class="flex flex-col gap-3">
				<Label class="font-semibold">Payment Method</Label>
				<RadioGroup.Root bind:value={paymentMethod} class="grid grid-cols-2 gap-4">
					<Label
						for="cash"
						class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
					>
						<RadioGroup.Item value="cash" id="cash" class="sr-only" />
						<DollarSign class="mb-3 h-6 w-6" />
						Cash
					</Label>
					<Label
						for="gcash"
						class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
					>
						<RadioGroup.Item value="gcash" id="gcash" class="sr-only" />
						<QrCode class="mb-3 h-6 w-6" />
						GCash
					</Label>
				</RadioGroup.Root>
			</div>

			<!-- Conditional Inputs -->
			{#if paymentMethod === 'cash'}
				<div class="grid gap-2" transition:slide={{ duration: 300, easing: quintOut }}>
					<Label for="cash-tendered" class="font-semibold">Cash Tendered</Label>
					<Input
						id="cash-tendered"
						type="number"
						placeholder="Enter amount"
						bind:value={cashTendered}
						class="text-lg"
					/>
					{#if change > 0}
						<p class="text-right text-lg font-medium">
							Change: <span class="text-green-500 font-bold">₱{change.toFixed(2)}</span>
						</p>
					{/if}
				</div>
			{/if}

			{#if paymentMethod === 'gcash'}
				<div class="grid gap-2" transition:slide={{ duration: 300, easing: quintOut }}>
					<Label for="gcash-reference" class="font-semibold">GCash Reference No.</Label>
					<Input
						id="gcash-reference"
						placeholder="Enter reference number"
						bind:value={gcashReference}
						class="text-lg"
					/>
				</div>
			{/if}

			<!-- Optional Customer Info -->
			<div class="grid gap-2">
				<Label class="font-semibold">Customer</Label>
				<div class="flex items-center justify-between rounded-md border p-3">
					<span class="text-sm text-muted-foreground">{customerName || 'Walk-in Customer'}</span>
					<Button variant="outline" size="sm" onclick={() => (showCustomerModal = true)}>
						<User class="mr-2 h-4 w-4" />
						{customerName ? 'Edit' : 'Add'}
					</Button>
				</div>
			</div>

			<!-- Print Receipt Toggle -->
			<div class="flex items-center space-x-2">
				<Checkbox id="print-receipt" bind:checked={printReceipt} />
				<label
					for="print-receipt"
					class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					Print Receipt
				</label>
			</div>
		</div>

		<Dialog.Footer class="grid grid-cols-2 gap-2">
			<Button variant="outline" onclick={handleCancel}>Cancel</Button>
			<Button onclick={handleConfirm}>
				Confirm Payment
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<CustomerInputModal
	bind:open={showCustomerModal}
	onSave={(details) => (customerName = details.name)}
	onCancel={() => {}}
/>
