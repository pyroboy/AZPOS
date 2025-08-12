<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
import { getInventoryItems, createInventoryMovement } from '$lib/remote/inventory.remote';
import type { Product, ProductBatch } from '$lib/types';
import { toast } from 'svelte-sonner';
import { z, type ZodError } from 'zod';
import { Textarea } from '$lib/components/ui/textarea';
import { Switch } from '$lib/components/ui/switch';
import { Checkbox } from '$lib/components/ui/checkbox';

	// Get inventory data using remote functions
	const inventoryQuery = getInventoryItems({});

	let {
		product,
		productList,
		open = $bindable()
	}: {
		product: Product | null;
		productList: Product[] | null;
		open: boolean;
	} = $props();

	// Add a type alias for backwards compatibility
	type ProductWithStock = Product;

	const isBulkMode = $derived(productList && productList.length > 0);

	// State will be computed in template with inventory data

	const reasonOptions = [
		{ value: 'stock_count', label: 'Stock Count' },
		{ value: 'damaged', label: 'Damaged Goods' },
		{ value: 'theft', label: 'Theft' },
		{ value: 'return', label: 'Customer Return' },
		{ value: 'other', label: 'Other' }
	];

	// Form-specific schema
	const adjustmentFormSchema = z
		.object({
			productId: z.string().min(1, 'Please select a product'),
			adjustment_type: z.enum(['add', 'remove', 'set']),
			quantity: z.coerce.number().min(0, 'Quantity must be positive'),
			isNewBatch: z.boolean(),
			selectedBatchId: z.string().optional(),
			new_batch_number: z.string().optional(),
			new_batch_expiration: z.string().optional(),
			new_batch_cost: z.coerce.number().optional(),
			reason: z.string().min(1, 'Please select a reason'),
			notes: z.string().optional()
		})
		.refine((data) => data.isNewBatch || data.selectedBatchId, {
			message: 'Select an existing batch or create a new one',
			path: ['selectedBatchId']
		})
		.refine(
			(data) => !data.isNewBatch || (data.new_batch_number && data.new_batch_number.length > 0),
			{
				message: 'Batch number is required for a new batch',
				path: ['new_batch_number']
			}
		);

	type AdjustmentForm = z.infer<typeof adjustmentFormSchema>;

	let allowNegativeStock = $state(false);

	let form = $state({
		data: {
			productId: product?.id ?? '',
			adjustment_type: 'add' as 'add' | 'remove' | 'set',
			quantity: 0,
			isNewBatch: false,
			selectedBatchId: '',
			new_batch_number: '',
			new_batch_expiration: '',
			new_batch_cost: 0,
			reason: '',
			notes: ''
		} as AdjustmentForm,
		errors: {} as ZodError<AdjustmentForm>['formErrors']['fieldErrors']
	});

	// Will be computed in template context

	const selectedReasonLabel = $derived(
		form.data.reason
			? reasonOptions.find((r) => r.value === form.data.reason)?.label
			: 'Select a reason'
	);

	$effect(() => {
		form.data.productId = product?.id ?? '';
	});

	// newStockLevel will be computed in template context

	let isSubmitting = $state(false);

	async function handleSubmit() {
		try {
			isSubmitting = true;

			const validation = adjustmentFormSchema.safeParse(form.data);
			if (!validation.success) {
				form.errors = validation.error.flatten().fieldErrors;
				toast.error('Please fix the errors in the form.');
				return;
			}

			form.errors = {};
			const data = validation.data;

			if (isBulkMode && productList) {
				toast.info('Bulk adjustment is not yet implemented.');
			} else if (product) {
				if (data.isNewBatch) {
					// Create a new batch using inventory movement
					await createInventoryMovement({
						product_id: product.id!,
						movement_type: 'adjustment',
						quantity: data.quantity,
						batch_number: data.new_batch_number!,
						reason: data.reason,
						notes: data.notes,
						reference_number: `BATCH-${Date.now()}`
					});
					toast.success(`New batch ${data.new_batch_number} created for ${product.name}.`);
				} else {
					// Adjust an existing batch using inventory movement
					let adjustmentQuantity = data.quantity;
					
					switch (data.adjustment_type) {
						case 'add':
							adjustmentQuantity = data.quantity;
							break;
						case 'remove':
							adjustmentQuantity = -data.quantity;
							break;
						case 'set':
							// For 'set', use the quantity as is (will be computed in template)
							adjustmentQuantity = data.quantity;
							break;
					}
					
					await createInventoryMovement({
						product_id: product.id!,
						movement_type: 'adjustment',
						quantity: adjustmentQuantity,
						batch_number: data.selectedBatchId,
						reason: data.reason,
						notes: data.notes,
						reference_number: `ADJ-${Date.now()}`
					});
					toast.success(`Stock for batch updated successfully.`);
				}
				handleClose();
			}
		} catch (error) {
			console.error('Adjustment failed:', error);
			toast.error('An unexpected error occurred.');
		} finally {
			isSubmitting = false;
		}
	}

	function resetForm() {
		form.data = {
			productId: product?.id ?? '',
			adjustment_type: 'add',
			quantity: 0,
			isNewBatch: false,
			selectedBatchId: '',
			new_batch_number: '',
			new_batch_expiration: '',
			new_batch_cost: 0,
			reason: '',
			notes: ''
		} as AdjustmentForm;
		form.errors = {};
	}

	function handleClose() {
		open = false;
		resetForm();
	}
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => !isOpen && handleClose()}>
	{#if open}
		{#await inventoryQuery}
			<Dialog.Content class="max-w-md">
				<Dialog.Header>
					<Dialog.Title>Loading...</Dialog.Title>
				</Dialog.Header>
				<div class="p-4">Loading inventory data...</div>
			</Dialog.Content>
		{:then inventoryData}
			{@const productWithStock = inventoryData.inventory_items.find((p: any) => p.product_id === product?.id)}
			{@const existingBatches = productWithStock?.batches ?? []}
			{@const currentStock = productWithStock?.quantity_available ?? 0}
			{@const selectedBatchLabel = form.data.selectedBatchId 
				? (existingBatches.find((b: ProductBatch) => b.id === form.data.selectedBatchId)?.batch_number ?? 'Select a batch')
				: 'Select a batch'}
			{@const newStockLevel = (() => {
				if (form.data.adjustment_type === 'set') {
					const selectedBatch = existingBatches.find((b: ProductBatch) => b.id === form.data.selectedBatchId);
					const otherBatchesStock = existingBatches
						.filter((b: ProductBatch) => b.id !== form.data.selectedBatchId)
						.reduce((sum: number, b: ProductBatch) => sum + b.quantity_on_hand, 0);
					return otherBatchesStock + form.data.quantity;
				}
				const change = form.data.adjustment_type === 'add' ? form.data.quantity : -form.data.quantity;
				return currentStock + change;
			})()}
			<Dialog.Content class="max-w-md">
			<Dialog.Header>
				{#if isBulkMode}
					<Dialog.Title>Bulk Adjust Stock ({productList?.length} items)</Dialog.Title>
					<Dialog.Description
						>Apply the same adjustment to all selected products.</Dialog.Description
					>
				{:else if product}
					<Dialog.Title>Adjust Stock: {product.name}</Dialog.Title>
					<Dialog.Description>SKU: {product.sku}</Dialog.Description>
				{/if}
			</Dialog.Header>

			<form onsubmit={handleSubmit} id="adjustment-form">
				<div class="space-y-4">
					{#if !isBulkMode && product}
						<div class="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
							<div class="text-center">
								<p class="text-sm font-medium text-muted-foreground">Current Stock</p>
								<p class="text-2xl font-bold">{currentStock}</p>
							</div>
							<div class="text-center">
								<p class="text-sm font-medium text-muted-foreground">New Stock Level</p>
								<p class="text-2xl font-bold text-primary">
									{newStockLevel() < 0 ? 0 : newStockLevel()}
								</p>
							</div>
						</div>
					{/if}

					<div class="space-y-2">
						<Label>Adjustment Type</Label>
						<ToggleGroup.Root
							type="single"
							class="justify-start"
							bind:value={form.data.adjustment_type}
						>
							<ToggleGroup.Item value="add">Add</ToggleGroup.Item>
							<ToggleGroup.Item value="remove">Remove</ToggleGroup.Item>
							<ToggleGroup.Item value="set">Set</ToggleGroup.Item>
						</ToggleGroup.Root>
					</div>

					{#if existingBatches.length > 0}
						<div class="space-y-2">
							<div class="flex items-center space-x-2">
								<Checkbox id="isNewBatch" bind:checked={form.data.isNewBatch} />
								<label
									for="isNewBatch"
									class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
								>
									Create a new batch
								</label>
							</div>
						</div>
					{/if}

					{#if !form.data.isNewBatch && existingBatches.length > 0}
						<div class="space-y-2">
							<Label for="batch">Batch</Label>
							<Select.Root bind:value={form.data.selectedBatchId} type="single">
								<Select.Trigger id="batch">
									{selectedBatchLabel}
								</Select.Trigger>
								<Select.Content>
									{#each existingBatches as batch}
										{@const label =
											`${batch.batch_number} (Qty: ${batch.quantity_on_hand})` +
											(batch.expiration_date
												? ` - Exp: ${new Date(batch.expiration_date).toLocaleDateString()}`
												: '')}
										<Select.Item value={batch.id} {label}>{label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							{#if form.errors.selectedBatchId}<p class="text-sm text-destructive">
									{form.errors.selectedBatchId[0]}
								</p>{/if}
						</div>
					{/if}

					{#if form.data.isNewBatch}
						<div class="p-4 border rounded-md space-y-4">
							<p class="text-sm font-medium">New Batch Details</p>
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<Label for="new_batch_number">Batch Number</Label>
									<Input
										id="new_batch_number"
										name="new_batch_number"
										bind:value={form.data.new_batch_number}
									/>
									{#if form.errors.new_batch_number}<p class="text-sm text-destructive">
											{form.errors.new_batch_number[0]}
										</p>{/if}
								</div>
								<div class="space-y-2">
									<Label for="new_batch_cost">Purchase Cost</Label>
									<Input
										id="new_batch_cost"
										name="new_batch_cost"
										type="number"
										bind:value={form.data.new_batch_cost}
									/>
								</div>
							</div>
							<div class="space-y-2">
								<Label for="new_batch_expiration">Expiration Date (Optional)</Label>
								<Input
									id="new_batch_expiration"
									name="new_batch_expiration"
									type="date"
									bind:value={form.data.new_batch_expiration}
								/>
							</div>
						</div>
					{/if}

					<div class="grid grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="quantity">Quantity</Label>
							<Input id="quantity" name="quantity" type="number" bind:value={form.data.quantity} />
							{#if form.errors.quantity}<p class="text-sm text-destructive">
									{form.errors.quantity[0]}
								</p>{/if}
						</div>
						<div class="space-y-2">
							<Label for="reason">Reason</Label>
							<Select.Root name="reason" bind:value={form.data.reason} type="single">
								<Select.Trigger>
									{selectedReasonLabel}
								</Select.Trigger>
								<Select.Content>
									{#each reasonOptions as { value, label }}
										<Select.Item {value} {label}>{label}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
							{#if form.errors.reason}<p class="text-sm text-destructive">
									{form.errors.reason[0]}
								</p>{/if}
						</div>
					</div>

					<div class="space-y-2">
						<Label for="notes">Notes (Optional)</Label>
						<Textarea id="notes" name="notes" bind:value={form.data.notes} />
					</div>
					<div class="flex items-center space-x-2 pt-2">
						<Switch id="allow-negative-stock" bind:checked={allowNegativeStock} />
						<Label for="allow-negative-stock">Allow negative stock</Label>
					</div>
				</div>
			</form>

			<Dialog.Footer class="mt-6">
				<Button variant="outline" onclick={handleClose} disabled={isSubmitting}>Cancel</Button>
				<Button type="submit" form="adjustment-form" disabled={isSubmitting}>
					{#if isSubmitting}
						<div class="flex items-center space-x-2">
							<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
							<span>Processing...</span>
						</div>
					{:else}
						Apply Adjustment
					{/if}
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
		{:catch error}
			<Dialog.Content class="max-w-md">
				<Dialog.Header>
					<Dialog.Title>Error</Dialog.Title>
				</Dialog.Header>
				<div class="p-4 text-red-500">
					Failed to load inventory data: {error.message}
				</div>
				<Dialog.Footer>
					<Button variant="outline" onclick={handleClose}>Close</Button>
				</Dialog.Footer>
			</Dialog.Content>
		{/await}
	{/if}
</Dialog.Root>
