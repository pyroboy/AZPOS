<script lang="ts">
	// Stores & Types
	import type { Discount, Modifier, ProductBatch, CartItem, User } from '$lib/schemas/models';
	import type { NewTransactionInput } from '$lib/stores/transactionStore';
	import PinDialog from '$lib/components/auth/PinDialog.svelte';
	import type { ProductWithStock } from '$lib/stores/inventoryStore';
	import { inventory } from '$lib/stores/inventoryStore';
	import { transactions } from '$lib/stores/transactionStore';
	import { cart } from '$lib/stores/cartStore';
	import { paymentStore } from '$lib/stores/paymentStore';
	import { receiptStore, type ReceiptData } from '$lib/stores/receiptStore';
	import { getModifiersForProduct } from '$lib/stores/modifierStore';
	import { productBatches } from '$lib/stores/productBatchStore';
	import { currency } from '$lib/utils/currency';
	import { v4 as uuidv4 } from 'uuid';

	// Components
	import BatchSelectionPanel from '$lib/components/pos/BatchSelectionPanel.svelte';
	import ManagerOverrideModal from '$lib/components/pos/ManagerOverrideModal.svelte';
	import ModifierSelectionModal from '$lib/components/pos/ModifierSelectionModal.svelte';
	import DiscountSelectionModal from '$lib/components/pos/DiscountSelectionModal.svelte';
	import ReturnProcessingModal from '$lib/components/pos/ReturnProcessingModal.svelte';
	import PaymentModal from '$lib/components/pos/PaymentModal.svelte';
	import PrintReceipt from '$lib/components/pos/PrintReceipt.svelte';
	import BarcodeInput from '$lib/components/inventory/BarcodeInput.svelte';
	import { shortcut } from '@svelte-put/shortcut';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Trash2, Pencil } from 'lucide-svelte';
	import * as Dialog from '$lib/components/ui/dialog';

	// --- Component State ---
	let searchTerm = $state('');
	let activeCategory = $state('All');

	// Panel/Modal State
	let selectedProductForBatchSelection = $state<ProductWithStock | null>(null);
	let showBatchSelectionPanel = $state(false);

	let productForModifierSelection = $state<ProductWithStock | null>(null);
	let isModifierModalOpen = $state(false);
	let selectedModifiersForCart = $state<Modifier[]>([]);

	// Manager Override Modal State
	let showManagerOverrideModal = $state(false);
	let showPinDialog = $state(false);
	let actionToConfirm = $state<(() => void) | null>(null);
	let overrideTitle = $state('');
	let overrideMessage = $state('');

	// Discount Modal State
	let showDiscountModal = $state(false);
	let appliedDiscount = $state<Discount | null>(null);

	// Return Modal State
	let showReturnModal = $state(false);

	// Payment & Receipt Modal State
	let showPaymentModal = $state(false);
	let showPrintReceiptModal = $state(false);
	let receiptData: ReceiptData | null = $state(null);

	// Price Override State
	let itemForPriceOverride = $state<CartItem | null>(null);
	let isPriceInputOpen = $state(false);
	let newPriceInput = $state(0);

	// --- Derived State ---
	const categories = $derived([
		'All',
		...new Set($inventory.map((p) => p.category_id).filter((c): c is string => !!c))
	]);

	const filteredProducts = $derived(
		$inventory.filter((p) => {
			if (p.is_archived) return false;
			const matchesCategory = activeCategory === 'All' || p.category_id === activeCategory;
			const lowerSearch = searchTerm.toLowerCase();
			const matchesSearch = lowerSearch
				? p.name.toLowerCase().includes(lowerSearch) || p.sku.toLowerCase().includes(lowerSearch)
				: true;
			return matchesCategory && matchesSearch;
		})
	);

	const finalizedCart = $derived.by(() => {
		// This ensures the derived value recalculates whenever the cart's contents or discount change.
		const unsub = cart.subscribe(() => {});
		unsub();
		return cart.finalizeCart();
	});

	const subtotal = $derived($cart.items.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0));

	// --- Event Handlers ---
	function handleProductClick(product: ProductWithStock) {
		const availableModifiers = getModifiersForProduct(product.id);

		if (availableModifiers.length > 0) {
			productForModifierSelection = product;
			isModifierModalOpen = true;
		} else {
			// No modifiers, proceed to batch selection
			proceedToBatchSelection(product, []);
		}
	}

	function handleModifiersApplied(modifiers: Modifier[]) {
		if (productForModifierSelection) {
			proceedToBatchSelection(productForModifierSelection, modifiers);
		}
		isModifierModalOpen = false;
		productForModifierSelection = null;
	}

	function proceedToBatchSelection(product: ProductWithStock, modifiers: Modifier[]) {
		selectedModifiersForCart = modifiers;
		const batchesWithStock = product.batches.filter((b) => b.quantity_on_hand > 0);

		if (batchesWithStock.length === 0) {
			requestManagerOverride(
				'Out of Stock',
				'This product is out of stock. An override is required to sell.',
				() => {
					if (product.batches.length > 0) {
						selectedProductForBatchSelection = product;
						showBatchSelectionPanel = true;
					} else {
						alert('Cannot sell product: No batches exist for this item.');
					}
				}
			);
			return;
		}

		// If batch tracking is enforced, always show the panel to confirm.
		// Otherwise, add directly if only one batch exists.
		if (product.requires_batch_tracking || batchesWithStock.length > 1) {
			selectedProductForBatchSelection = product;
			showBatchSelectionPanel = true;
		} else if (batchesWithStock.length === 1) {
			cart.addItem(product, batchesWithStock[0], 1, selectedModifiersForCart);
			selectedModifiersForCart = []; // Reset
		}
	}

	function handleBatchSelected(batch: ProductBatch) {
		if (selectedProductForBatchSelection) {
			cart.addItem(selectedProductForBatchSelection, batch, 1, selectedModifiersForCart);
		}
		closeAndResetAllModals();
	}

	function requestManagerOverride(title: string, message: string, onConfirm: () => void) {
		overrideTitle = title;
		overrideMessage = message;
		actionToConfirm = onConfirm;
		showManagerOverrideModal = true;
	}

	function handleOverrideConfirm() {
		if (actionToConfirm) {
			actionToConfirm();
		}
		showManagerOverrideModal = false;
	}

	function handleOverrideCancel() {
		showManagerOverrideModal = false;
	}

	function handleDiscountApplied(discount: Discount) {
		cart.applyDiscount({
			type: discount.type === 'fixed_amount' ? 'fixed' : 'percentage',
			value: discount.value
		});
		appliedDiscount = discount; // Keep for display purposes
	}

	function removeDiscount() {
		cart.applyDiscount(null);
		appliedDiscount = null;
	}

	function handleCharge() {
		if ($cart.items.length === 0) return;
		showPaymentModal = true;
	}

	function handlePaymentCancel() {
		showPaymentModal = false;
	}

	async function handlePaymentConfirm(paymentDetails: any) {

		// 1. Create Transaction
		const transactionId = uuidv4();
		const transactionItems = finalizedCart.items.map((item) => ({
			id: uuidv4(),
			transaction_id: transactionId,
			product_id: item.productId,
			batch_id: item.batchId,
			quantity: item.quantity,
			price_at_sale: item.finalPrice,
			applied_modifiers: item.modifiers
		}));

		const transactionData: NewTransactionInput = {
			user_id: 'c2a7e3e0-12d3-4b8e-a9a7-3f8b5b6b1f2a', // Placeholder
			items: transactionItems,
			subtotal: finalizedCart.subtotal,
			tax_amount: finalizedCart.tax,
			discount_amount: finalizedCart.discountAmount,
			total_amount: finalizedCart.total,
			payments: [
				{
					id: crypto.randomUUID(),
					transaction_id: transactionId,
					payment_method: paymentDetails.paymentMethod,
					amount: paymentDetails.total,
					processed_at: new Date().toISOString(),
					...(paymentDetails.paymentMethod === 'gcash' && { reference_number: paymentDetails.gcashReference })
				}
			]
		};

		const newTransaction = transactions.addTransaction(transactionData);

		// 2. Deduct stock
		for (const item of finalizedCart.items) {
			productBatches.removeStockFromBatch(item.batchId, item.quantity);
		}

		// 3. Handle Receipt
		if (paymentDetails.printReceipt) {
			receiptData = {
				transactionId: newTransaction.id,
				date: newTransaction.created_at,
				timestamp: new Date(),
				items: finalizedCart.items.map((i) => ({ ...i, name: i.name })),
				subtotal: finalizedCart.subtotal,
				tax: finalizedCart.tax,
				discount: finalizedCart.discountAmount,
				total: finalizedCart.total,
				paymentMethod: paymentDetails.paymentMethod,
				amountPaid: paymentDetails.cashTendered || paymentDetails.total,
				change: paymentDetails.change,
				cashier: 'Admin', // Placeholder
				customer: paymentDetails.customerName
			};
			showPrintReceiptModal = true;
		}

		// 4. Reset state
		showPaymentModal = false;
		cart.clearCart();
		appliedDiscount = null;
	}

	function handleReceiptClose() {
		showPrintReceiptModal = false;
		receiptData = null;
	}

	function handlePriceClick(item: CartItem) {
		itemForPriceOverride = item;
		showPinDialog = true;
	}

	function handlePinSuccess(user: User) {
		if (itemForPriceOverride) {
			console.log(`Price override approved by ${user.full_name}`);
			newPriceInput = itemForPriceOverride.finalPrice;
			isPriceInputOpen = true;
		}
		showPinDialog = false; // Close PIN dialog
	}

	function handleNewPriceSubmit() {
		if (!itemForPriceOverride) return;
		cart.updateItemPrice(itemForPriceOverride.cartItemId, newPriceInput);
		isPriceInputOpen = false;
		itemForPriceOverride = null;
	}

	function handleRemoveItem(item: CartItem) {
		requestManagerOverride(
			'Manager Override Required',
			'Please enter manager PIN to remove this item.',
			() => cart.removeItem(item.cartItemId)
		);
	}

	function closeAndResetAllModals() {
		showBatchSelectionPanel = false;
		isModifierModalOpen = false;
		showManagerOverrideModal = false;
		selectedProductForBatchSelection = null;
		productForModifierSelection = null;
		selectedModifiersForCart = [];
		actionToConfirm = null;
		overrideTitle = '';
		overrideMessage = '';
	}
</script>

<BatchSelectionPanel
	bind:open={showBatchSelectionPanel}
	product={selectedProductForBatchSelection}
	onSelect={handleBatchSelected}
/>

<ManagerOverrideModal
	bind:show={showManagerOverrideModal}
	title={overrideTitle}
	message={overrideMessage}
	onConfirm={handleOverrideConfirm}
	onCancel={handleOverrideCancel}
/>

<svelte:window
	use:shortcut={{
		trigger: {
			key: 'F8',
			callback: handleCharge
		}
	}}
/>

{#if productForModifierSelection}
	<ModifierSelectionModal
		product={productForModifierSelection}
		onApply={handleModifiersApplied}
		onClose={closeAndResetAllModals}
	/>
{/if}

<DiscountSelectionModal
	bind:open={showDiscountModal}
	onApply={handleDiscountApplied}
/>

<ReturnProcessingModal bind:open={showReturnModal} />

<PaymentModal
	bind:open={showPaymentModal}
	totalAmount={cart.finalizeCart().total}
	onConfirm={handlePaymentConfirm}
	onCancel={() => (showPaymentModal = false)}
/>

<PinDialog bind:open={showPinDialog} onSuccess={handlePinSuccess} requiredRole="manager" />

{#if itemForPriceOverride}
	<Dialog.Root bind:open={isPriceInputOpen}>
		<Dialog.Content class="sm:max-w-[425px]">
			<Dialog.Header>
				<Dialog.Title>Override Price</Dialog.Title>
				<Dialog.Description>
					Enter the new price for <strong>{itemForPriceOverride.name}</strong>.
				</Dialog.Description>
			</Dialog.Header>
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="new-price" class="text-right"> New Price </Label>
					<Input
						id="new-price"
						type="number"
						bind:value={newPriceInput}
						class="col-span-3"
						step="0.01"
					/>
				</div>
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (isPriceInputOpen = false)}>Cancel</Button>
				<Button type="submit" onclick={handleNewPriceSubmit}>Set Price</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<div
	class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-4 h-screen p-4 font-sans"

>
	<main class="xl:col-span-3 flex flex-col gap-4 overflow-hidden h-[calc(100vh-10vh)]">
		<Card.Root class="flex-shrink-0">
			<Card.Header>
				<Card.Title>Products</Card.Title>
				<div class="relative w-full max-w-sm">
					<BarcodeInput
						placeholder="Scan barcode..."
						onscan={(code: string) => {
							const hit = filteredProducts.find((p) => p.sku === code || p.id === code);
							if (hit) handleProductClick(hit);
						}}
					/>
				</div>
			</Card.Header>
			<Card.Content>
				<div class="flex gap-2 mb-4 flex-wrap">
					{#each categories as category}
						<Button
							variant={activeCategory === category ? 'default' : 'outline'}
							onclick={() => (activeCategory = category)}>{category}</Button
						>
					{/each}
				</div>
			</Card.Content>
		</Card.Root>
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto pr-2 h-full">
			{#each filteredProducts as product (product.id)}
				<button
					onclick={() => handleProductClick(product)}
					class="border rounded-lg p-2 text-center hover:bg-muted transition-colors flex flex-col items-center justify-between"
				>
					<img
						src={product.image_url || '/placeholder.svg'}
						alt={product.name}
						class="w-24 h-24 object-cover mb-2 rounded-md"
					/>
					<span class="text-sm font-medium">{product.name}</span>
					<span class="text-xs text-muted-foreground">{currency(product.price)}</span>
					<Badge variant={product.stock > 0 ? 'secondary' : 'destructive'}>
						{product.stock} in stock
					</Badge>
				</button>
			{/each}
		</div>
	</main>

	<div class="xl:col-span-2 bg-background rounded-lg shadow-sm flex flex-col h-full">
		<header class="p-4 border-b flex justify-between items-center flex-shrink-0">
			<h2 class="text-xl font-semibold">Current Order</h2>
			<div class="flex items-center gap-2">
				<Button variant="outline" size="sm" onclick={() => (showReturnModal = true)}
					>Process Return</Button
				>
				<Button
					variant="ghost"
					size="sm"
					onclick={() => cart.clearCart()}
					disabled={$cart.items.length === 0}>Clear Cart</Button
				>
			</div>
		</header>

		<div class="flex-1 p-4 space-y-3 overflow-y-auto">
			{#if $cart.items.length === 0}
				<div class="flex flex-col items-center justify-center h-full text-muted-foreground">
					<p>Your cart is empty.</p>
					<p class="text-sm">Click on a product to add it.</p>
				</div>
			{:else}
				{#each $cart.items as item (item.cartItemId)}
					<div class="flex justify-between items-start gap-2">
						<div class="flex items-start gap-3 flex-1">
							<img
								src={item.image_url || '/placeholder.svg'}
								alt={item.name}
								class="h-10 w-10 rounded-md object-cover"
							/>
							<div class="flex-1">
								<p class="font-medium text-sm leading-tight">{item.name}</p>
								<div class="text-xs text-muted-foreground">
									<button
										onclick={() => handlePriceClick(item)}
										class="flex items-center gap-1 hover:text-primary transition-colors p-0 m-0 h-auto"
										title="Override Price"
									>
										<span>{currency(item.finalPrice)}</span>
										<Pencil class="h-3 w-3" />
									</button>
								</div>
								{#if item.modifiers.length > 0}
									<div class="text-xs text-muted-foreground pl-2 border-l-2 ml-1 mt-1">
										{#each item.modifiers as modifier}
											<div>
												+ {modifier.name} ({currency(modifier.price_adjustment)})
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
						<div class="flex items-center gap-2">
							<Input
								type="number"
								value={item.quantity}
								oninput={(e) => cart.updateQuantity(item.cartItemId, e.currentTarget.valueAsNumber)}
								class="w-16 h-8 text-center"
							/>
							<Button
								variant="ghost"
								size="icon"
								class="h-8 w-8"
								onclick={() => handleRemoveItem(item)}
							>
								<Trash2 class="h-4 w-4 text-destructive" />
							</Button>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<footer class="p-4 mt-auto border-t space-y-3 flex-shrink-0">
			<div class="flex justify-between">
				<span>Subtotal</span>
				<span>{currency(subtotal)}</span>
			</div>
			<div class="flex justify-between">
				<span>Tax (12%)</span>
				<span>{currency(finalizedCart.tax)}</span>
			</div>
			{#if finalizedCart.discountAmount > 0}
				<div class="flex justify-between text-green-600">
					<span>Discount</span>
					<span>-{currency(finalizedCart.discountAmount)}</span>
				</div>
			{/if}
			<div class="flex justify-between font-bold text-lg border-t pt-2 mt-2">
				<span>Total</span>
				<span>{currency(finalizedCart.total)}</span>
			</div>
			<Button class="w-full" size="lg" onclick={handleCharge} disabled={$cart.items.length === 0}>
				Charge
			</Button>
		</footer>
	</div>
</div>
