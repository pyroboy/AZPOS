<script lang="ts">
	import type { PurchaseOrder } from '$lib/types/purchaseOrder.schema';
	import type { InventoryItem } from '$lib/types/inventory.schema';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { usePurchaseOrders } from '$lib/data/purchaseOrder';
	import { useInventory } from '$lib/data/inventory';
	import { useProductBatches } from '$lib/data/productBatch';
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils';
	import * as Table from '$lib/components/ui/table';

	let {
		open = $bindable(false),
		po,
		onClose
	}: {
		open: boolean;
		po: PurchaseOrder | null;
		onClose: () => void;
	} = $props();

	const steps = [
		{ id: 1, name: 'Verification' },
		{ id: 2, name: 'Items' },
		{ id: 3, name: 'Confirmation' }
	];

	let currentStep = $state(1);

	// Form state for the wizard
	let carrierName = $state('');
	let trackingNumber = $state('');
	let packageCondition = $state('good');
	let receivedQuantities = $state<Record<string, number>>({});
	let batchNumbers = $state<Record<string, string>>({});
	let expirationDates = $state<Record<string, string>>({});
	let purchaseCosts = $state<Record<string, number>>({});
	let notes = $state('');
	let isSubmitting = $state(false);

	// Initialize data hooks
	const purchaseOrdersHook = usePurchaseOrders();
	const inventoryHook = useInventory();
	const productBatchesHook = useProductBatches();

	// Extract reactive data from hooks
	const { updatePurchaseOrder } = purchaseOrdersHook;
	const { createBatch } = productBatchesHook;
	const inventoryData = $derived(inventoryHook.inventoryQuery.data ?? []);

	$effect(() => {
		if (po) {
			const initialQuantities: Record<string, number> = {};
			const initialBatchNumbers: Record<string, string> = {};
			const initialExpirationDates: Record<string, string> = {};
			const initialPurchaseCosts: Record<string, number> = {};

			po.items.forEach((item) => {
				initialQuantities[item.product_id] = item.quantity_received || 0;
				initialBatchNumbers[item.product_id] = '';
				initialExpirationDates[item.product_id] = '';
				// Use unit_cost if available, otherwise default to 0
				initialPurchaseCosts[item.product_id] = item.unit_cost || 0;
			});

			receivedQuantities = initialQuantities;
			batchNumbers = initialBatchNumbers;
			expirationDates = initialExpirationDates;
			purchaseCosts = initialPurchaseCosts;
		}
	});

	function setAllItemsReceived() {
		if (!po) return;
		const allReceived: Record<string, number> = {};
		po.items.forEach((item) => {
			allReceived[item.product_id] = item.quantity_ordered;
		});
		receivedQuantities = allReceived;
	}

	function nextStep() {
		if (currentStep < steps.length) {
			currentStep += 1;
		}
	}

	function prevStep() {
		if (currentStep > 1) {
			currentStep -= 1;
		}
	}

	async function completeReceiving() {
		if (!po) return;

		// Validate required fields for received items
		const validationErrors: string[] = [];
		po.items.forEach((item) => {
			const product = inventoryData.find((p: any) => p.product_id === item.product_id);
			const quantityReceived = receivedQuantities[item.product_id] ?? 0;
			if (quantityReceived > 0 && product) {
				if (product.requires_batch_tracking || product.requiresBatchTracking) {
					if (!batchNumbers[item.product_id]?.trim()) {
						validationErrors.push(`Batch number required for tracked item: ${item.product_name}`);
					}
					if (!expirationDates[item.product_id]?.trim()) {
						validationErrors.push(
							`Expiration date required for tracked item: ${item.product_name}`
						);
					}
				}
				if (!purchaseCosts[item.product_id] || purchaseCosts[item.product_id] <= 0) {
					validationErrors.push(`Purchase cost required for ${item.product_name}`);
				}
			}
		});

		if (validationErrors.length > 0) {
			toast.error(`Please fix the following errors:\n${validationErrors.join('\n')}`);
			return;
		}

		isSubmitting = true;

		try {
			// 1. Create ProductBatch records for received items
			for (const item of po.items) {
				const quantityReceived = receivedQuantities[item.product_id] ?? 0;
				if (quantityReceived > 0) {
					// Create new batch record
					const batchData = {
						productId: item.product_id,
						batchNumber: batchNumbers[item.product_id],
						expirationDate: expirationDates[item.product_id] || undefined,
						quantityOnHand: quantityReceived,
						purchaseCost: purchaseCosts[item.product_id]
					};

					await createBatch.mutateAsync(batchData);
				}
			}

			// Skip step 2 since updateItemReceivedQuantity doesn't exist in the hook

			// 3. Update PO status
			const totalOrdered = po.items.reduce((sum, item) => sum + item.quantity_ordered, 0);
			const totalReceived = po.items.reduce(
				(sum, item) => sum + (receivedQuantities[item.product_id] ?? 0),
				0
			);

			let newStatus: PurchaseOrder['status'] = 'partially_received';
			if (totalReceived >= totalOrdered) {
				newStatus = 'received';
			} else if (totalReceived === 0) {
				newStatus = po.status; // No change if nothing was received
			}

			await updatePurchaseOrder.mutateAsync({
				id: po.id,
				status: newStatus,
				carrierName,
				trackingNumber,
				packageCondition,
				notes
			});

			toast.success(`PO ${po.id} has been processed successfully.`);
			handleClose();
		} catch (error) {
			console.error('Error processing receiving:', error);
			toast.error('Failed to process receiving. Please try again.');
		} finally {
			isSubmitting = false;
		}
	}

	function handleClose() {
		// Reset state on close
		setTimeout(() => {
			currentStep = 1;
			carrierName = '';
			trackingNumber = '';
			packageCondition = 'good';
		}, 300); // delay to allow animation to finish
		onClose();
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	{#if po}
		<Dialog.Content class="sm:max-w-4xl">
			<Dialog.Header>
				<Dialog.Title>Receive Purchase Order: {po.id}</Dialog.Title>
				<Dialog.Description
					>Follow the steps to receive items for this purchase order.</Dialog.Description
				>
			</Dialog.Header>

			<!-- Stepper -->
			<div class="flex justify-between items-center my-8">
				{#each steps as step, i}
					<div class="flex items-center">
						<div
							class={cn(
								'flex items-center justify-center w-8 h-8 rounded-full font-bold',
								step.id === currentStep
									? 'bg-primary text-primary-foreground'
									: step.id < currentStep
										? 'bg-green-600 text-white'
										: 'bg-muted text-muted-foreground'
							)}
						>
							{step.id < currentStep ? '✓' : step.id}
						</div>
						<p class={cn('ml-4 font-semibold', step.id === currentStep ? 'text-primary' : '')}>
							{step.name}
						</p>
					</div>
					{#if i < steps.length - 1}
						<div class="flex-1 h-px bg-border mx-4"></div>
					{/if}
				{/each}
			</div>

			<!-- Step Content -->
			<div class="min-h-[300px]">
				{#if currentStep === 1}
					<div class="space-y-6">
						<h3 class="text-lg font-semibold">Step 1: Verification</h3>
						<div class="grid grid-cols-2 gap-6">
							<div class="space-y-2">
								<Label for="carrier">Carrier Name</Label>
								<Input id="carrier" bind:value={carrierName} placeholder="e.g., FedEx, UPS" />
							</div>
							<div class="space-y-2">
								<Label for="tracking">Tracking Number</Label>
								<Input
									id="tracking"
									bind:value={trackingNumber}
									placeholder="e.g., 1Z9999W99999999999"
								/>
							</div>
						</div>
						<div class="space-y-2">
							<Label>Package Condition</Label>
							<ToggleGroup.Root type="single" class="justify-start" bind:value={packageCondition}>
								<ToggleGroup.Item value="good">Good</ToggleGroup.Item>
								<ToggleGroup.Item value="damaged">Damaged</ToggleGroup.Item>
								<ToggleGroup.Item value="partial">Partial</ToggleGroup.Item>
							</ToggleGroup.Root>
						</div>
						<div class="space-y-2">
							<Label>Upload Photos</Label>
							<div
								class="w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground"
							>
								<p>Drag & drop files here, or click to select files</p>
								<input type="file" class="hidden" multiple accept="image/*" />
							</div>
						</div>
					</div>
				{:else if currentStep === 2}
					<div class="space-y-4">
						<div class="flex justify-between items-center">
							<h3 class="text-lg font-semibold">Step 2: Items & Batch Information</h3>
							<Button variant="secondary" size="sm" onclick={setAllItemsReceived}
								>All Items Received</Button
							>
						</div>
						<div class="text-sm text-gray-600 mb-4">
							For each item received, please enter the batch number, expiration date (if
							applicable), and actual purchase cost.
						</div>
						<div class="space-y-6">
							{#each po.items as item (item.product_id)}
								{@const receivedQty = receivedQuantities[item.product_id] ?? 0}
								{@const product = inventoryData.find((p: any) => p.product_id === item.product_id)}
								{@const requiresTracking =
									(product?.requires_batch_tracking || product?.requiresBatchTracking) ?? false}
								<div class="border rounded-lg p-4 space-y-4">
									<div class="flex justify-between items-center">
										<div>
											<h4 class="font-medium">{item.product_name}</h4>
											<p class="text-sm text-gray-500">SKU: {item.product_sku}</p>
										</div>
										<div class="text-right">
											<p class="text-sm">
												Expected: <span class="font-medium">{item.quantity_ordered}</span>
											</p>
										</div>
									</div>

									<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
										<div class="space-y-2">
											<Label for="qty-{item.product_id}">Received Qty *</Label>
											<Input
												id="qty-{item.product_id}"
												type="number"
												min="0"
												step="1"
												class="text-center"
												bind:value={receivedQuantities[item.product_id]}
												placeholder="0"
											/>
										</div>

										<div class="space-y-2">
											<Label for="batch-{item.product_id}"
												>Batch Number {requiresTracking ? '*' : ''}</Label
											>
											<Input
												id="batch-{item.product_id}"
												type="text"
												bind:value={batchNumbers[item.product_id]}
												placeholder="e.g., LOT123456"
												disabled={receivedQty <= 0}
												required={requiresTracking && receivedQty > 0}
												class={receivedQty <= 0 ? 'bg-gray-100' : ''}
											/>
										</div>

										<div class="space-y-2">
											<Label for="expiry-{item.product_id}"
												>Expiration Date {requiresTracking ? '*' : ''}</Label
											>
											<Input
												id="expiry-{item.product_id}"
												type="date"
												bind:value={expirationDates[item.product_id]}
												disabled={receivedQty <= 0}
												required={requiresTracking && receivedQty > 0}
												class={receivedQty <= 0 ? 'bg-gray-100' : ''}
											/>
										</div>

										<div class="space-y-2">
											<Label for="cost-{item.product_id}">Purchase Cost *</Label>
											<Input
												id="cost-{item.product_id}"
												type="number"
												min="0"
												step="0.01"
												bind:value={purchaseCosts[item.product_id]}
												placeholder="0.00"
												disabled={receivedQty <= 0}
												class={receivedQty <= 0 ? 'bg-gray-100' : ''}
											/>
										</div>
									</div>

									{#if receivedQty > 0 && requiresTracking && (!batchNumbers[item.product_id] || !expirationDates[item.product_id])}
										<div class="text-sm text-red-600 bg-red-50 p-2 rounded">
											⚠️ Batch number and expiration date are required for this tracked item.
										</div>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{:else if currentStep === 3}
					<div class="space-y-6">
						<h3 class="text-lg font-semibold">Step 3: Confirmation</h3>
						<div class="space-y-4 p-4 border rounded-lg bg-muted/50">
							<h4 class="font-semibold">Summary</h4>
							<div class="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
								<p><strong>Carrier:</strong> {carrierName || 'N/A'}</p>
								<p><strong>Tracking #:</strong> {trackingNumber || 'N/A'}</p>
								<p>
									<strong>Package Condition:</strong>
									<span class="capitalize">{packageCondition}</span>
								</p>
							</div>
							<div class="border-t pt-4 mt-4">
								<h5 class="font-semibold mb-2">Items to Receive</h5>
								<Table.Root>
									<Table.Header>
										<Table.Row>
											<Table.Head>Product</Table.Head>
											<Table.Head class="text-center">Expected</Table.Head>
											<Table.Head class="text-center">Received</Table.Head>
											<Table.Head class="text-center">Variance</Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#each po.items as item}
											{@const received = receivedQuantities[item.product_id] ?? 0}
											{@const variance = received - item.quantity_ordered}
											<Table.Row>
												<Table.Cell>{item.product_name}</Table.Cell>
												<Table.Cell class="text-center">{item.quantity_ordered}</Table.Cell>
												<Table.Cell class="text-center font-bold text-primary"
													>{received}</Table.Cell
												>
												<Table.Cell
													class={cn(
														'text-center font-bold',
														variance > 0 && 'text-green-600',
														variance < 0 && 'text-red-600'
													)}>{variance > 0 ? '+' : ''}{variance}</Table.Cell
												>
											</Table.Row>
										{/each}
									</Table.Body>
								</Table.Root>
							</div>
							<div class="space-y-2 pt-4 mt-4 border-t">
								<Label for="notes">Notes (Optional)</Label>
								<Textarea
									id="notes"
									bind:value={notes}
									placeholder="Add any notes about this receiving shipment..."
								/>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<Dialog.Footer class="mt-8 pt-4 border-t">
				<div class="w-full flex justify-between">
					<Button variant="outline" onclick={handleClose}>Cancel</Button>
					<div class="flex gap-2">
						{#if currentStep > 1}
							<Button variant="secondary" onclick={prevStep}>Previous</Button>
						{/if}
						{#if currentStep < steps.length}
							<Button onclick={nextStep}>Next</Button>
						{:else}
							<Button variant="default" onclick={completeReceiving} disabled={isSubmitting}>
								{#if isSubmitting}
									<svg
										class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											class="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											stroke-width="4"
										></circle>
										<path
											class="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
									Processing...
								{:else}
									Complete Receiving
								{/if}
							</Button>
						{/if}
					</div>
				</div>
			</Dialog.Footer>
		</Dialog.Content>
	{/if}
</Dialog.Root>
