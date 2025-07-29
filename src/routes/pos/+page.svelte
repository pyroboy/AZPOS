<script lang="ts">
	// Data Hooks & Types - Following COMPONENT_INTEGRATION_GUIDE.md
	import type { Discount, Modifier, User } from '$lib/schemas/models';
	import type { Product } from '$lib/types/product.schema';
	import type { ProductBatch } from '$lib/types/productBatch.schema';
	import type { EnhancedCartItem, CartItemModifier } from '$lib/types/cart.schema';
	import type { CreateTransaction } from '$lib/types/transaction.schema';
	import type { ReceiptGeneration } from '$lib/types/receipt.schema';
	import { useInventory } from '$lib/data/inventory';
	import { useTransactions } from '$lib/data/transaction';
	import { useCart } from '$lib/data/cart';
	import { usePayments } from '$lib/data/payment';
	import { useReceipts } from '$lib/data/receipt';
	import { useModifiers } from '$lib/data/modifier';
	import { useProductBatches } from '$lib/data/productBatch';
	import { currency } from '$lib/utils/currency';
	import { v4 as uuidv4 } from 'uuid';
	// Auth pattern
	import { useAuth } from '$lib/data/auth';
	import RoleGuard from '$lib/components/ui/RoleGuard.svelte';
	import StaffModeBadge from '$lib/components/ui/StaffModeBadge.svelte';

	// Components
	import BatchSelectionPanel from '$lib/components/pos/BatchSelectionPanel.svelte';
	import ManagerOverrideModal from '$lib/components/pos/ManagerOverrideModal.svelte';
	import ModifierSelectionModal from '$lib/components/pos/ModifierSelectionModal.svelte';
	import DiscountSelectionModal from '$lib/components/pos/DiscountSelectionModal.svelte';
	import ReturnProcessingModal from '$lib/components/pos/ReturnProcessingModal.svelte';
	import PaymentModal from '$lib/components/pos/PaymentModal.svelte';
	import PrintReceipt from '$lib/components/pos/PrintReceipt.svelte';
	import BarcodeInput from '$lib/components/inventory/BarcodeInput.svelte';
	import PinDialog from '$lib/components/auth/PinDialog.svelte';
	import { shortcut } from '@svelte-put/shortcut';

	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Trash2, Pencil } from 'lucide-svelte';
	import * as Dialog from '$lib/components/ui/dialog';

	// Initialize data hooks - Following TanStack Query pattern
	const auth = useAuth();
	const {
		inventoryQuery,
		inventoryItems,
		isLoading: isInventoryLoading,
		isError: isInventoryError,
		error: inventoryError
	} = useInventory();
	const {
		transactionsQuery,
		createTransaction,
		isLoading: isTransactionLoading
	} = useTransactions();
	const {
		cartQuery,
		cartTotals,
		items: cartItems,
		addItem: addCartItem,
		updateQuantity,
		removeItem,
		applyDiscount,
		clearCart,
		isEmpty: isCartEmpty
	} = useCart();
	const {
		processPayment,
		isPaymentSuccessful,
		processPaymentStatus
	} = usePayments();
	const {
		generateReceipt,
		isLoading: isReceiptLoading
	} = useReceipts();
	const { modifiers: modifiersList } = useModifiers();
	const {
		batchesQuery,
		batches,
		activeBatches,
		updateBatch
	} = useProductBatches();
	
	// --- Component State ---
	let searchTerm = $state('');
	let activeCategory = $state<string>('All');

	// Panel/Modal State
	let selectedProductForBatchSelection = $state<any | null>(null);
	let showBatchSelectionPanel = $state(false);

	let productForModifierSelection = $state<any | null>(null);
	let isModifierModalOpen = $state(false);
	let selectedModifiersForCart = $state<CartItemModifier[]>([]);

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
	let receiptData: ReceiptGeneration | null = $state(null);

	// Price Override State
	let itemForPriceOverride = $state<EnhancedCartItem | null>(null);
	let isPriceInputOpen = $state(false);
	let newPriceInput = $state(0);

	// --- Derived State - Using TanStack Query data ---
	const categories = $derived([
		'All',
		...new Set(inventoryItems().map((p: any) => p.product?.category_id).filter((c: any): c is string => !!c))
	] as string[]);

	const filteredProducts = $derived(
		inventoryItems().filter((item: any) => {
			const product = item.product;
			if (!product || product.is_archived) return false;
			const matchesCategory = activeCategory === 'All' || product.category_id === activeCategory;
			const lowerSearch = searchTerm.toLowerCase();
			const matchesSearch = lowerSearch
				? product.name.toLowerCase().includes(lowerSearch) || product.sku.toLowerCase().includes(lowerSearch)
				: true;
			return matchesCategory && matchesSearch;
		})
	);

	const finalizedCart = $derived({
		subtotal: cartTotals.subtotal,
		tax: cartTotals.tax,
		discount_amount: cartTotals.discount_amount,
		total: cartTotals.total,
		items: cartItems
	});

	const subtotal = $derived(cartTotals.subtotal);

	// --- Event Handlers - Using TanStack Query mutations ---
	function handleProductClick(inventoryItem: any) {
		const product = inventoryItem.product;
		if (!product) return;
		
		const availableModifiers = modifiersList.filter((m: any) => m.product_id === product.id);

		if (availableModifiers.length > 0) {
			productForModifierSelection = product;
			isModifierModalOpen = true;
		} else {
			// No modifiers, proceed to add item directly
			addCartItem(product, 1, [], undefined);
		}
	}

	function handleModifiersApplied(modifiers: any[]) {
		if (productForModifierSelection) {
			// Convert modifier format if needed
			const cartModifiers: CartItemModifier[] = modifiers.map((mod: any) => ({
				modifier_id: mod.id || mod.modifier_id,
				modifier_name: mod.name || mod.modifier_name,
				price_adjustment: mod.price_adjustment
			}));
			addCartItem(productForModifierSelection, 1, cartModifiers, undefined);
		}
		isModifierModalOpen = false;
		productForModifierSelection = null;
	}

	function handleBatchSelected(batch: ProductBatch) {
		if (selectedProductForBatchSelection) {
			addCartItem(selectedProductForBatchSelection, 1, selectedModifiersForCart, undefined);
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
		applyDiscount({
			type: discount.type === 'fixed_amount' ? 'fixed' : 'percentage',
			value: discount.value
		});
		appliedDiscount = discount; // Keep for display purposes
	}

	function removeDiscount() {
		// Apply null discount to remove
		applyDiscount({ type: 'fixed', value: 0 });
		appliedDiscount = null;
	}

	function handleCharge() {
		if (cartItems.length === 0) return;
		showPaymentModal = true;
	}

async function handlePaymentConfirm(paymentDetails: any) {
    // Payment processing using TanStack Query mutations
    try {
        const paymentData = {
            amount: paymentDetails.total,
            payment_method_id: 'some-payment-method-id',
            payment_method_type: paymentDetails.paymentMethod,
            reference: paymentDetails.paymentMethod === 'gcash' ? paymentDetails.gcashReference : undefined,
            metadata: {
                amount_tendered: paymentDetails.cashTendered,
                change_given: paymentDetails.change,
                customer: paymentDetails.customerName
            }
        };

        const paymentResult = await processPayment(paymentData);

        if (!isPaymentSuccessful(paymentResult)) {
            console.error('Payment failed:', paymentResult.error_message);
            alert('Payment failed: ' + (paymentResult.error_message || ''));
            return;
        }

        // Create transaction using proper schema
        const transactionData: CreateTransaction = {
            customer_name: paymentDetails.customerName,
            customer_email: paymentDetails.customerEmail,
            customer_phone: paymentDetails.customerPhone,
			items: finalizedCart.items.map((item: any) => ({
				product_id: item.product_id,
				product_name: item.product_name,
				product_sku: item.product_sku,
				quantity: item.quantity,
				unit_price: item.base_price,
				discount_amount: 0,
				tax_amount: 0,
				total_amount: item.final_price,
				modifiers: item.selected_modifiers?.map((mod: any) => ({
					modifier_id: mod.modifier_id,
					modifier_name: mod.modifier_name,
					selected_options: []
				}))
			})),
			subtotal: finalizedCart.subtotal,
			discount_amount: finalizedCart.discount_amount,
			tax_amount: finalizedCart.tax,
			tip_amount: 0,
			total_amount: finalizedCart.total,
            payment_methods: [{
                type: paymentDetails.paymentMethod,
                amount: finalizedCart.total,
                reference: paymentDetails.reference,
                status: 'completed'
            }],
            receipt_email: paymentDetails.customerEmail,
            receipt_phone: paymentDetails.customerPhone
        };

        const newTransaction = await createTransaction(transactionData);

        // Handle receipt generation
        if (paymentDetails.printReceipt) {
            const receiptGenData: ReceiptGeneration = {
                transaction_id: newTransaction.id,
                format: 'thermal',
                delivery_method: 'print',
                recipient: {
                    email: paymentDetails.customerEmail,
                    phone: paymentDetails.customerPhone
                }
            };

            try {
                await generateReceipt(receiptGenData);
                showPrintReceiptModal = true;
            } catch (error) {
                console.error('Receipt generation error:', error);
                alert('An error occurred while generating the receipt.');
            }
        }

        // Reset state
        showPaymentModal = false;
        clearCart();
        appliedDiscount = null;
    } catch (error) {
        console.error('Payment processing error:', error);
        alert('An unexpected error occurred during payment processing.');
    }
}

function handlePaymentCancel() {
	showPaymentModal = false;
}

function handleReceiptClose() {
		showPrintReceiptModal = false;
		receiptData = null;
	}

	function handlePriceClick(item: EnhancedCartItem) {
		itemForPriceOverride = item;
		showPinDialog = true;
	}

	function handlePinSuccess(user: User) {
		if (itemForPriceOverride) {
			console.log(`Price override approved by ${user.full_name}`);
			newPriceInput = itemForPriceOverride.final_price;
			isPriceInputOpen = true;
		}
		showPinDialog = false;
	}

	function handleNewPriceSubmit() {
		if (!itemForPriceOverride) return;
		// Note: Price override functionality would need to be implemented in cart hook
		// For now, we'll update the quantity to trigger a recalculation
		updateQuantity(itemForPriceOverride.cart_item_id, itemForPriceOverride.quantity);
		isPriceInputOpen = false;
		itemForPriceOverride = null;
	}

	function handleRemoveItem(item: EnhancedCartItem) {
		requestManagerOverride(
			'Manager Override Required',
			'Please enter manager PIN to remove this item.',
			() => removeItem(item.cart_item_id)
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
		totalAmount={cartTotals.total}
		onConfirm={handlePaymentConfirm}
		onCancel={() => (showPaymentModal = false)}
	/>

<PinDialog bind:open={showPinDialog} onSuccess={handlePinSuccess} requiredRole="manager" />

<PrintReceipt 
	open={showPrintReceiptModal}
	onClose={handleReceiptClose} 
/>

	{#if itemForPriceOverride}
		<Dialog.Root bind:open={isPriceInputOpen}>
			<Dialog.Content class="sm:max-w-[425px]">
				<Dialog.Header>
					<Dialog.Title>Override Price</Dialog.Title>
					<Dialog.Description>
						Enter the new price for <strong>{itemForPriceOverride.product_name}</strong>.
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

<RoleGuard 
	roles={['cashier', 'pharmacist', 'manager', 'admin', 'owner']} 
	permissions={['pos:operate']} 
	requireStaffMode={true}
	requireAuthentication={true}
>
	<div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-4 h-screen p-4 font-sans">
		<!-- Header with Staff Badge -->
		<div class="xl:col-span-5 flex justify-between items-center pb-2">
			<h1 class="text-2xl font-bold">Point of Sale</h1>
			<StaffModeBadge />
		</div>
	<main class="xl:col-span-3 flex flex-col gap-4 overflow-hidden h-[calc(100vh-10vh)]">
		<Card.Root class="flex-shrink-0">
			<Card.Header>
				<Card.Title>Products</Card.Title>
				<div class="relative w-full max-w-sm">
					<BarcodeInput
						placeholder="Scan barcode..."
						onscan={(code: string) => {
							const hit = filteredProducts.find((p: any) => p.product?.sku === code || p.id === code);
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
		{#if $inventoryQuery.isPending}
			<div class="flex items-center justify-center h-64">
				<div class="loading-spinner">Loading products...</div>
			</div>
		{:else if $inventoryQuery.isError}
			<div class="flex items-center justify-center h-64 text-red-500">
				<div>Error loading products: {inventoryError()?.message}</div>
			</div>
		{:else}
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto pr-2 h-full">
				{#each filteredProducts as inventoryItem (inventoryItem.id)}
					{#if inventoryItem.product}
						<button
							onclick={() => handleProductClick(inventoryItem)}
							class="border rounded-lg p-2 text-center hover:bg-muted transition-colors flex flex-col items-center justify-between"
						>
							<img
								src={inventoryItem.product.image_url || '/placeholder.svg'}
								alt={inventoryItem.product.name || 'Product'}
								class="w-24 h-24 object-cover mb-2 rounded-md"
							/>
							<span class="text-sm font-medium">{inventoryItem.product.name || 'Unnamed Product'}</span>
							<span class="text-xs text-muted-foreground">{currency(inventoryItem.product.selling_price || 0)}</span>
							<Badge variant={inventoryItem.quantity_available > 0 ? 'secondary' : 'destructive'}>
								{inventoryItem.quantity_available || 0} in stock
							</Badge>
						</button>
					{/if}
				{/each}
			</div>
		{/if}
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
				onclick={() => clearCart()}
				disabled={isCartEmpty}>Clear Cart</Button
			>
			</div>
		</header>

		<div class="flex-1 p-4 space-y-3 overflow-y-auto">
			{#if $cartQuery.isPending}
				<div class="flex items-center justify-center h-full">
					<div class="loading-spinner">Loading cart...</div>
				</div>
			{:else if $cartQuery.isError}
				<div class="flex items-center justify-center h-full text-red-500">
					<div>Error loading cart</div>
				</div>
			{:else if isCartEmpty}
				<div class="flex flex-col items-center justify-center h-full text-muted-foreground">
					<p>Your cart is empty.</p>
					<p class="text-sm">Click on a product to add it.</p>
				</div>
			{:else}
				{#each cartItems as item (item.cart_item_id)}
					<div class="flex justify-between items-start gap-2">
						<div class="flex items-start gap-3 flex-1">
							<img
								src={item.image_url || '/placeholder.svg'}
								alt={item.product_name}
								class="h-10 w-10 rounded-md object-cover"
							/>
							<div class="flex-1">
								<p class="font-medium text-sm leading-tight">{item.product_name}</p>
								<div class="text-xs text-muted-foreground">
									<button
										onclick={() => handlePriceClick(item)}
										class="flex items-center gap-1 hover:text-primary transition-colors p-0 m-0 h-auto"
										title="Override Price"
									>
										${(item.final_price / 100).toFixed(2)}
									</button>
								</div>
							</div>
						</div>
						<div class="flex items-center gap-2">
							<Input
								type="number"
								value={item.quantity}
								oninput={(e) => updateQuantity(item.cart_item_id, e.currentTarget.valueAsNumber)}
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
			{#if finalizedCart.discount_amount > 0}
				<div class="flex justify-between text-green-600">
					<span>Discount</span>
					<span>-{currency(finalizedCart.discount_amount)}</span>
				</div>
			{/if}
			<div class="flex justify-between font-bold text-lg border-t pt-2 mt-2">
				<span>Total</span>
				<span>{currency(finalizedCart.total)}</span>
			</div>
			<Button 
				class="w-full" 
				size="lg" 
				onclick={handleCharge} 
				disabled={isCartEmpty || processPaymentStatus === 'pending'}
			>
				{#if processPaymentStatus === 'pending'}
					Processing Payment...
				{:else}
					Charge
				{/if}
			</Button>
		</footer>
	</div>
	</div>


	{#snippet fallback()}
		<div class="flex items-center justify-center min-h-screen">
			<Card.Root class="w-full max-w-md">
				<Card.Header class="text-center">
					<Card.Title class="flex items-center justify-center gap-2 text-muted-foreground">
						<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
						</svg>
						POS Access Restricted
					</Card.Title>
				</Card.Header>
				<Card.Content class="text-center">
					<p class="text-muted-foreground mb-4">
						You need staff permissions to access the Point of Sale system.
					</p>
					<p class="text-sm text-muted-foreground">
						Please ensure you're authenticated with cashier, pharmacist, manager, admin, or owner privileges and staff mode is enabled.
					</p>
					<div class="mt-6">
						<StaffModeBadge />
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	{/snippet}
</RoleGuard>
