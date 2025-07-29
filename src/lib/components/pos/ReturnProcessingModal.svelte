<script lang="ts">
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { AlertTriangle } from 'lucide-svelte';

	// Import TanStack Query hooks according to Component Integration Guide
	import { useTransactions } from '$lib/data/transaction';
	import { useReturns } from '$lib/data/returns.svelte';
	import { useProducts } from '$lib/data/product';
	import { useSessions } from '$lib/data/session';
	import type { Transaction, TransactionItem } from '$lib/types/transaction.schema';
	import type { ReturnItem, NewReturnInput } from '$lib/types/returns.schema';
	import type { Product } from '$lib/types/product.schema';

	// Props according to the new pattern
	type Props = {
		open?: boolean;
	};

	let { open = $bindable(false) }: Props = $props();

	// Get data and actions from TanStack Query hooks
	const { useTransaction } = useTransactions();
	const { createReturn, isCreating } = useReturns();
	const { products } = useProducts();
	const { currentSession } = useSessions();

	let transactionIdInput = $state('');
	let foundTransaction = $state<Transaction | null>(null);
	let selectedItemsToReturn = $state<Set<string>>(new Set()); // Will store TransactionItem IDs
	let errorMessage = $state<string | null>(null);
	let step = $state<'search' | 'selection' | 'summary'>('search');

	// Create transaction query when we have an ID - use $derived instead of $:
	const transactionQuery = $derived(
		transactionIdInput.trim() ? useTransaction(transactionIdInput.trim()) : null
	);

	function findTransaction() {
		errorMessage = null;
		if (!transactionQuery) {
			errorMessage = 'Please enter a transaction ID.';
			return;
		}

		// Check if transaction exists and is loaded
		if (transactionQuery.isLoading) {
			errorMessage = 'Loading transaction...';
			return;
		}

		if (transactionQuery.isError || !transactionQuery.data) {
			foundTransaction = null;
			errorMessage = 'Transaction not found. Please check the ID and try again.';
		} else {
			foundTransaction = transactionQuery.data;
			step = 'selection';
		}
	}

	function toggleReturnItem(transactionItemId: string) {
		const newSet = new Set(selectedItemsToReturn);
		if (newSet.has(transactionItemId)) {
			newSet.delete(transactionItemId);
		} else {
			newSet.add(transactionItemId);
		}
		selectedItemsToReturn = newSet;
	}

	async function processReturn() {
		if (!foundTransaction || selectedItemsToReturn.size === 0) return;

		const itemsToReturn = foundTransaction.items.filter((item) =>
			selectedItemsToReturn.has(item.product_id)
		);

		// Create a return record using TanStack Query mutation
		const returnItems: ReturnItem[] = itemsToReturn.map((item) => {
			const product = getProduct(item.product_id);
			return {
				product_id: item.product_id,
				product_name: product?.name ?? item.product_name,
				product_sku: product?.sku ?? item.product_sku,
				quantity: item.quantity
			};
		});

		const newReturnData: NewReturnInput = {
			order_id: foundTransaction.id,
			customer_name: foundTransaction.customer_name ?? 'Walk-in Customer',
			items: returnItems,
			reason: 'changed_mind', // Placeholder
			notes: `Refund of $${returnTotal.toFixed(2)} processed by ${currentSession?.user_id ?? 'system'}.`
		};

		try {
			const newReturn = await createReturn(newReturnData);
			alert(`Return processed successfully! Return ID: ${newReturn.id}`);
			closeModal();
		} catch (error: unknown) {
			const errorText = error instanceof Error ? error.message : 'Unknown error occurred';
			errorMessage = `Failed to process return: ${errorText}`;
		}
	}

	function closeModal() {
		open = false;
	}

	$effect(() => {
		if (!open) {
			// Reset state when modal is closed
			setTimeout(() => {
				transactionIdInput = '';
				foundTransaction = null;
				selectedItemsToReturn = new Set();
				errorMessage = null;
				step = 'search';
			}, 300); // Delay to allow animation to finish
		}
	});

	const returnTotal = $derived(
		foundTransaction?.items
			.filter((item) => selectedItemsToReturn.has(item.product_id))
			.reduce((sum, item) => sum + item.unit_price * item.quantity, 0) ?? 0
	);

	const getProduct = (productId: string): Product | undefined =>
		products().find((p: Product) => p.id === productId);
</script>

<Dialog bind:open>
	<DialogContent class="max-w-2xl">
		<DialogHeader>
			<DialogTitle>Process Return</DialogTitle>
			<DialogDescription>
				{step === 'search'
					? "Enter the transaction ID from the customer's receipt."
					: 'Select the items to be returned.'}
			</DialogDescription>
		</DialogHeader>

		{#if errorMessage}
			<Alert variant="destructive">
				<AlertTriangle class="w-12 h-12 mx-auto text-yellow-400" />
				<AlertTitle>Error</AlertTitle>
				<AlertDescription>{errorMessage}</AlertDescription>
			</Alert>
		{/if}

		{#if step === 'search'}
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="txn-id" class="text-right">Transaction ID</Label>
					<Input
						id="txn-id"
						bind:value={transactionIdInput}
						class="col-span-3"
						placeholder="Enter transaction UUID"
					/>
				</div>
			</div>
		{:else if step === 'selection' && foundTransaction}
			<div class="py-4 space-y-4">
				<h4 class="font-medium">Original Items</h4>
				<div class="border rounded-lg max-h-[40vh] overflow-y-auto">
					{#each foundTransaction.items as item (item.product_id)}
						{@const product = getProduct(item.product_id)}
						<div
							class="flex items-center gap-4 p-4 border-b last:border-b-0 cursor-pointer"
							onclick={() => toggleReturnItem(item.product_id)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') toggleReturnItem(item.product_id);
							}}
							role="button"
							tabindex="0"
						>
							<Checkbox
								id={item.product_id}
								checked={selectedItemsToReturn.has(item.product_id)}
								tabindex={-1}
							/>
							<Label for={item.product_id} class="flex-1 w-full h-full">
								<div class="font-medium">
									{product?.name ?? item.product_name}
									<Badge variant="outline">x{item.quantity}</Badge>
								</div>
								<div class="text-sm text-muted-foreground">${item.unit_price.toFixed(2)} each</div>
							</Label>
						</div>
					{/each}
				</div>
				<div class="text-right font-medium">
					Total Refund Amount: ${returnTotal.toFixed(2)}
				</div>
			</div>
		{/if}

		<DialogFooter>
			<Button variant="outline" onclick={closeModal}>Cancel</Button>
			{#if step === 'search'}
				<Button onclick={findTransaction} disabled={!transactionIdInput}>Find Transaction</Button>
			{:else if step === 'selection'}
				<Button onclick={processReturn} disabled={selectedItemsToReturn.size === 0}
					>Process Return</Button
				>
			{/if}
		</DialogFooter>
	</DialogContent>
</Dialog>
