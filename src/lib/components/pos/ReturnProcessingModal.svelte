<script lang="ts">
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Badge } from '$lib/components/ui/badge';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { AlertTriangle } from 'lucide-svelte';

	import { transactions as transactionStore } from '$lib/stores/transactionStore';
	import { returns as returnStore } from '$lib/stores/returnStore';
	import { productBatches as productBatchStore } from '$lib/stores/productBatchStore';
	import { products as productStore } from '$lib/stores/productStore';
	import { session } from '$lib/stores/sessionStore';

	import type { Transaction, TransactionItem, ReturnItem } from '$lib/schemas/models';

	let {
		open = $bindable(false)
	}: {
		open?: boolean;
	} = $props();

	let transactionIdInput = $state('');
	let foundTransaction = $state<Transaction | null>(null);
	let selectedItemsToReturn = $state<Set<string>>(new Set()); // Will store TransactionItem IDs
	let errorMessage = $state<string | null>(null);
	let step = $state<'search' | 'selection' | 'summary'>('search');

	function findTransaction() {
		errorMessage = null;
		const result = transactionStore.findById(transactionIdInput.trim());
		if (result) {
			foundTransaction = result;
			step = 'selection';
		} else {
			foundTransaction = null;
			errorMessage = 'Transaction not found. Please check the ID and try again.';
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

	function processReturn() {
		if (!foundTransaction || selectedItemsToReturn.size === 0) return;

		const itemsToReturn = foundTransaction.items.filter(item => selectedItemsToReturn.has(item.id));

		// 1. Update inventory for each returned item
		for (const item of itemsToReturn) {
			// Disposition should be handled by a select in a real scenario
			if (item.batch_id) {
				productBatchStore.addStockToBatch(item.batch_id, item.quantity);
			}
		}

		// 2. Create a return record
		const returnItems: ReturnItem[] = itemsToReturn.map(item => {
			const product = $productStore.find(p => p.id === item.product_id);
			return {
				product_id: item.product_id,
				product_name: product?.name ?? 'Unknown Product',
				product_sku: product?.sku ?? 'N/A',
				quantity: item.quantity
			};
		});

		const newReturn = returnStore.addReturn({
			order_id: foundTransaction.id,
			customer_name: 'Walk-in Customer', // Placeholder
			items: returnItems,
			reason: 'changed_mind', // Placeholder
			notes: `Refund of $${returnTotal.toFixed(2)} processed by ${$session.currentUser?.username ?? 'system'}.`,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		});

		alert(`Return processed successfully! Return ID: ${newReturn.id}`);

		closeModal();
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
			.filter(item => selectedItemsToReturn.has(item.id))
			.reduce((sum, item) => sum + item.price_at_sale * item.quantity, 0) ?? 0
	);

	const getProduct = (productId: string) => $productStore.find((p) => p.id === productId);



</script>

<Dialog bind:open>
    <DialogContent class="max-w-2xl">
        <DialogHeader>
            <DialogTitle>Process Return</DialogTitle>
            <DialogDescription>
                {step === 'search' ? 'Enter the transaction ID from the customer\'s receipt.' : 'Select the items to be returned.'}
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
                    <Input id="txn-id" bind:value={transactionIdInput} class="col-span-3" placeholder="Enter transaction UUID" />
                </div>
            </div>
        {:else if step === 'selection' && foundTransaction}
            <div class="py-4 space-y-4">
                <h4 class="font-medium">Original Items</h4>
                <div class="border rounded-lg max-h-[40vh] overflow-y-auto">
                    {#each foundTransaction.items as item (item.id)}
                        {@const product = getProduct(item.product_id)}
                        <div
							class="flex items-center gap-4 p-4 border-b last:border-b-0 cursor-pointer"
							onclick={() => toggleReturnItem(item.id)}
							onkeydown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') toggleReturnItem(item.id);
							}}
							role="button"
							tabindex="0"
						>
							<Checkbox id={item.id} checked={selectedItemsToReturn.has(item.id)} tabindex={-1} />
                            <Label for={item.id} class="flex-1 w-full h-full">
                                <div class="font-medium">{product?.name ?? 'Loading...'} <Badge variant="outline">x{item.quantity}</Badge></div>
                                <div class="text-sm text-muted-foreground">${item.price_at_sale.toFixed(2)} each</div>
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
                <Button onclick={processReturn} disabled={selectedItemsToReturn.size === 0}>Process Return</Button>
            {/if}
        </DialogFooter>
    </DialogContent>
</Dialog>
