<script lang="ts">
	import type { PurchaseOrder } from '$lib/stores/purchaseOrderStore';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { poActions } from '$lib/stores/purchaseOrderStore';
	import { inventory, type ProductWithStock } from '$lib/stores/inventoryStore';
	import { productBatches } from '$lib/stores/productBatchStore';
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

	$effect(() => {
		if (po) {
			const initialQuantities: Record<string, number> = {};
			const initialBatchNumbers: Record<string, string> = {};
			const initialExpirationDates: Record<string, string> = {};
			const initialPurchaseCosts: Record<string, number> = {};
			
			po.items.forEach(item => {
				initialQuantities[item.productId] = item.quantityReceived;
				initialBatchNumbers[item.productId] = '';
				initialExpirationDates[item.productId] = '';
				// Use costPerUnit if available, otherwise default to 0
				initialPurchaseCosts[item.productId] = (item as any).costPerUnit || 0;
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
		po.items.forEach(item => {
			allReceived[item.productId] = item.quantityOrdered;
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
			const product = $inventory.find((p: ProductWithStock) => p.id === item.productId);
			const quantityReceived = receivedQuantities[item.productId] ?? 0;
			if (quantityReceived > 0 && product) {
				if (product.requires_batch_tracking) {
					if (!batchNumbers[item.productId]?.trim()) {
						validationErrors.push(`Batch number required for tracked item: ${item.productName}`);
					}
					if (!expirationDates[item.productId]?.trim()) {
						validationErrors.push(`Expiration date required for tracked item: ${item.productName}`);
					}
				}
				if (!purchaseCosts[item.productId] || purchaseCosts[item.productId] <= 0) {
					validationErrors.push(`Purchase cost required for ${item.productName}`);
				}
			}
		});
		
		if (validationErrors.length > 0) {
			toast.error(`Please fix the following errors:\n${validationErrors.join('\n')}`);
			return;
		}
		
		isSubmitting = true;

		// Simulate API call
		await new Promise((resolve) => setTimeout(resolve, 1500));

		// 1. Create ProductBatch records for received items
		po.items.forEach((item) => {
			const quantityReceived = receivedQuantities[item.productId] ?? 0;
			if (quantityReceived > 0) {
				// Create new batch record
				const batchData = {
					product_id: item.productId,
					batch_number: batchNumbers[item.productId],
					expiration_date: expirationDates[item.productId] || undefined,
					quantity_on_hand: quantityReceived,
					purchase_cost: purchaseCosts[item.productId]
				};
				
				productBatches.addBatch(batchData);
			}
		});

		// 2. Update PO item received quantities
		po.items.forEach((item) => {
			const quantityReceived = receivedQuantities[item.productId] ?? 0;
				poActions.updateReceivedQuantity(po.id, item.productId, quantityReceived);
		});

		// 3. Update PO status
		const totalOrdered = po.items.reduce((sum, item) => sum + item.quantityOrdered, 0);
		const totalReceived = po.items.reduce((sum, item) => sum + (receivedQuantities[item.productId] ?? 0), 0);

		let newStatus: PurchaseOrder['status'] = 'partial';
		if (totalReceived >= totalOrdered) {
			newStatus = 'completed';
		} else if (totalReceived === 0) {
			newStatus = po.status; // No change if nothing was received
		}
		poActions.updatePO(po.id, { status: newStatus });

		toast.success(`PO ${po.id} has been processed.`);
		isSubmitting = false;
		handleClose();
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
				<Dialog.Description>Follow the steps to receive items for this purchase order.</Dialog.Description>
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
								<Input id="tracking" bind:value={trackingNumber} placeholder="e.g., 1Z9999W99999999999" />
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
							<div class="w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
								<p>Drag & drop files here, or click to select files</p>
								<input type="file" class="hidden" multiple accept="image/*" />
							</div>
						</div>
					</div>
				{:else if currentStep === 2}
					<div class="space-y-4">
						<div class="flex justify-between items-center">
							<h3 class="text-lg font-semibold">Step 2: Items & Batch Information</h3>
							<Button variant="secondary" size="sm" onclick={setAllItemsReceived}>All Items Received</Button>
						</div>
						<div class="text-sm text-gray-600 mb-4">
							For each item received, please enter the batch number, expiration date (if applicable), and actual purchase cost.
						</div>
						<div class="space-y-6">
							{#each po.items as item (item.productId)}
								{@const receivedQty = receivedQuantities[item.productId] ?? 0}
								{@const product = $inventory.find((p: ProductWithStock) => p.id === item.productId)}
								{@const requiresTracking = product?.requires_batch_tracking ?? false}
								<div class="border rounded-lg p-4 space-y-4">
									<div class="flex justify-between items-center">
										<div>
											<h4 class="font-medium">{item.productName}</h4>
											<p class="text-sm text-gray-500">SKU: {item.productSku}</p>
										</div>
										<div class="text-right">
											<p class="text-sm">Expected: <span class="font-medium">{item.quantityOrdered}</span></p>
										</div>
									</div>
									
									<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
										<div class="space-y-2">
											<Label for="qty-{item.productId}">Received Qty *</Label>
											<Input
												id="qty-{item.productId}"
												type="number"
												min="0"
												step="1"
												class="text-center"
												bind:value={receivedQuantities[item.productId]}
												placeholder="0"
											/>
										</div>
										
										<div class="space-y-2">
											<Label for="batch-{item.productId}">Batch Number {requiresTracking ? '*' : ''}</Label>
											<Input
												id="batch-{item.productId}"
												type="text"
												bind:value={batchNumbers[item.productId]}
												placeholder="e.g., LOT123456"
												disabled={receivedQty <= 0}
												required={requiresTracking && receivedQty > 0}
												class={receivedQty <= 0 ? 'bg-gray-100' : ''}
											/>
										</div>
										
										<div class="space-y-2">
											<Label for="expiry-{item.productId}">Expiration Date {requiresTracking ? '*' : ''}</Label>
											<Input
												id="expiry-{item.productId}"
												type="date"
												bind:value={expirationDates[item.productId]}
												disabled={receivedQty <= 0}
												required={requiresTracking && receivedQty > 0}
												class={receivedQty <= 0 ? 'bg-gray-100' : ''}
											/>
										</div>
										
										<div class="space-y-2">
											<Label for="cost-{item.productId}">Purchase Cost *</Label>
											<Input
												id="cost-{item.productId}"
												type="number"
												min="0"
												step="0.01"
												bind:value={purchaseCosts[item.productId]}
												placeholder="0.00"
												disabled={receivedQty <= 0}
												class={receivedQty <= 0 ? 'bg-gray-100' : ''}
											/>
										</div>
									</div>
									
									{#if receivedQty > 0 && requiresTracking && (!batchNumbers[item.productId] || !expirationDates[item.productId])}
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
								<p><strong>Package Condition:</strong> <span class="capitalize">{packageCondition}</span></p>
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
											{@const received = receivedQuantities[item.productId] ?? 0}
											{@const variance = received - item.quantityOrdered}
											<Table.Row>
												<Table.Cell>{item.productName}</Table.Cell>
												<Table.Cell class="text-center">{item.quantityOrdered}</Table.Cell>
												<Table.Cell class="text-center font-bold text-primary">{received}</Table.Cell>
												<Table.Cell class={cn('text-center font-bold', variance > 0 && 'text-green-600', variance < 0 && 'text-red-600')}>{variance > 0 ? '+' : ''}{variance}</Table.Cell>
											</Table.Row>
										{/each}
									</Table.Body>
								</Table.Root>
							</div>
							<div class="space-y-2 pt-4 mt-4 border-t">
								<Label for="notes">Notes (Optional)</Label>
								<Textarea id="notes" bind:value={notes} placeholder="Add any notes about this receiving shipment..." />
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
									<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
										<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
										<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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
