<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { RadioGroup, RadioGroupItem } from '$lib/components/ui/radio-group';
	import { tick } from 'svelte';
	import CustomerInputModal from './CustomerInputModal.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';

	let { open = $bindable(false), totalAmount, onConfirm, onCancel } = $props();

	let paymentMethod: 'cash' | 'gcash' = $state('cash');
	let cashTendered: number | undefined = $state(undefined);
	let referenceNumber = $state('');
	let customerName = $state('');
	let printReceipt = $state(true);
	let showCustomerModal = $state(false);
	let cashTenderedInputRef = $state<HTMLInputElement | undefined>(undefined);

	const change = $derived(
		paymentMethod === 'cash' && cashTendered && cashTendered >= totalAmount
			? cashTendered - totalAmount
			: 0
	);

	const isValid = $derived(() => {
		if (paymentMethod === 'cash') {
			return cashTendered !== undefined && cashTendered >= totalAmount;
		} else if (paymentMethod === 'gcash') {
			return referenceNumber.trim() !== '';
		}
		return false;
	});

	function resetForm() {
		paymentMethod = 'cash';
		cashTendered = undefined;
		referenceNumber = '';
		customerName = '';
		printReceipt = true;
	}

	$effect(() => {
		if (open && paymentMethod === 'cash') {
			tick().then(() => {
				cashTenderedInputRef?.focus();
			});
		}

		if (!open) {
			resetForm();
		}
	});

	function handleConfirm() {
		if (isValid()) {
			onConfirm({
				paymentMethod,
				cashTendered: cashTendered,
				gcashReference: referenceNumber,
				customerName,
				printReceipt,
				total: totalAmount,
				change: change
			});
			open = false;
		}
	}
</script>

<Dialog bind:open>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>Payment</DialogTitle>
			<DialogDescription>Total Amount: P{totalAmount.toFixed(2)}</DialogDescription>
		</DialogHeader>

		<div class="grid gap-4 py-4">
			<RadioGroup bind:value={paymentMethod} class="grid grid-cols-2 gap-4">
				<div>
					<RadioGroupItem value="cash" id="cash" class="peer sr-only" />
					<Label
						for="cash"
						class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
					>
						Cash
					</Label>
				</div>
				<div>
					<RadioGroupItem value="gcash" id="gcash" class="peer sr-only" />
					<Label
						for="gcash"
						class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
					>
						GCash
					</Label>
				</div>
			</RadioGroup>

			{#if paymentMethod === 'cash'}
				<div class="grid gap-2">
					<Label for="cash-tendered">Cash Tendered</Label>
					<Input
						ref={cashTenderedInputRef}
						id="cash-tendered"
						type="number"
						placeholder="Enter amount"
						bind:value={cashTendered}
					/>
					{#if change > 0}
						<p class="text-sm text-muted-foreground">Change: P{change.toFixed(2)}</p>
					{/if}
				</div>
			{:else if paymentMethod === 'gcash'}
				<div class="grid gap-2">
					<Label for="reference-number">Reference Number</Label>
					<Input
						id="reference-number"
						type="text"
						placeholder="Enter GCash reference no."
						bind:value={referenceNumber}
					/>
				</div>
			{/if}

			<div class="grid gap-2">
				<Label for="customer-name">Customer Name (Optional)</Label>
				<div class="flex items-center gap-2">
					<Input
						id="customer-name"
						type="text"
						placeholder="Enter customer name"
						bind:value={customerName}
					/>
					<Button variant="outline" onclick={() => (showCustomerModal = true)}>Search</Button>
				</div>
			</div>
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

		<DialogFooter>
			<Button variant="outline" onclick={onCancel}>Cancel</Button>
			<Button type="submit" onclick={handleConfirm} disabled={!isValid}>Confirm Payment</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<CustomerInputModal
	bind:open={showCustomerModal}
	onSave={(details) => {
		customerName = details.name;
		showCustomerModal = false;
	}}
	onCancel={() => {
		showCustomerModal = false;
	}}
/>
