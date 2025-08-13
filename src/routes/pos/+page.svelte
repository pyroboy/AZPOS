<script lang="ts">
	// Remote Functions - Following CLAUDE.md migration patterns
	import type { Discount, Modifier, User } from '$lib/schemas/models';
	import type { Product } from '$lib/types/product.schema';
	import type { ProductBatch } from '$lib/types/productBatch.schema';
	import type { EnhancedCartItem, CartItemModifier } from '$lib/types/cart.schema';
	import type { CreateTransaction } from '$lib/types/transaction.schema';
	import type { ReceiptGeneration } from '$lib/types/receipt.schema';
	import { getProducts } from '$lib/remote/products.remote';
	import { createTransaction } from '$lib/remote/transactions.remote';
	import { getCart, addCartItem, updateCartItemQuantity, removeCartItem, clearCart, applyCartDiscount } from '$lib/remote/cart.remote';
	import { processPayment, isPaymentSuccessful } from '$lib/remote/payments.remote';
	import { generateReceipt } from '$lib/remote/receipts.remote';
	import { getModifiers } from '$lib/remote/modifiers.remote';
	import { currency } from '$lib/utils/currency';
	import { v4 as uuidv4 } from 'uuid';
	// Auth pattern
	import { authStore } from '$lib/stores/auth.svelte';
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

	// Initialize remote function calls - Following CLAUDE.md migration pattern
	// Modern Svelte 5 auth store (no longer using TanStack Query)
	
	// Data queries using remote functions
	const productsQuery = getProducts();
	const cartQuery = getCart();
	const modifiersQuery = getModifiers();
	
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

	// State for payment processing
	let processPaymentStatus = $state('idle');

	// --- Event Handlers - Using remote function calls ---
	async function handleProductClick(product: any) {
		if (!product) return;
		
		// Get modifiers for this product
		const modifiersData = await getModifiers({ product_id: product.id });
		
		if (modifiersData.length > 0) {
			productForModifierSelection = product;
			isModifierModalOpen = true;
		} else {
			// No modifiers, proceed to add item directly
			await addCartItem({
				product_id: product.id,
				quantity: 1,
				modifiers: []
			});
		}
	}

	async function handleModifiersApplied(modifiers: any[]) {
		if (productForModifierSelection) {
			// Convert modifier format if needed
			const cartModifiers: CartItemModifier[] = modifiers.map((mod: any) => ({
				modifier_id: mod.id || mod.modifier_id,
				modifier_name: mod.name || mod.modifier_name,
				price_adjustment: mod.price_adjustment
			}));
			await addCartItem({
				product_id: productForModifierSelection.id,
				quantity: 1,
				modifiers: cartModifiers
			});
		}
		isModifierModalOpen = false;
		productForModifierSelection = null;
	}

	async function handleBatchSelected(batch: ProductBatch) {
		if (selectedProductForBatchSelection) {
			await addCartItem({
				product_id: selectedProductForBatchSelection.id,
				quantity: 1,
				modifiers: selectedModifiersForCart,
				batch_id: batch.id
			});
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

	async function handleDiscountApplied(discount: Discount) {
		await applyCartDiscount({
			type: discount.type === 'fixed_amount' ? 'fixed' : 'percentage',
			value: discount.value
		});
		appliedDiscount = discount; // Keep for display purposes
	}

	async function removeDiscount() {
		// Apply null discount to remove
		await applyCartDiscount({ type: 'fixed', value: 0 });
		appliedDiscount = null;
	}

	function handleCharge() {
		if (cartItems.length === 0) return;
		showPaymentModal = true;
	}

async function handlePaymentConfirm(paymentDetails: any) {
    // Payment processing using remote functions
    try {
        processPaymentStatus = 'pending';
        
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
        const paymentSuccessful = await isPaymentSuccessful({ payment_result: paymentResult });

        if (!paymentSuccessful) {
            console.error('Payment failed:', paymentResult.error_message);
            alert('Payment failed: ' + (paymentResult.error_message || ''));
            processPaymentStatus = 'error';
            return;
        }

        // Get current cart data
        const cartData = await getCart();
        
        // Create transaction using proper schema
        const transactionData: CreateTransaction = {
            customer_name: paymentDetails.customerName,
            customer_email: paymentDetails.customerEmail,
            customer_phone: paymentDetails.customerPhone,
			items: cartData.items.map((item: any) => ({
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
				})) || []
			})),
			subtotal: cartData.totals.subtotal,
			discount_amount: cartData.totals.discount_amount,
			tax_amount: cartData.totals.tax,
			tip_amount: 0,
			total_amount: cartData.totals.total,
            payment_methods: [{
                type: paymentDetails.paymentMethod,
                amount: cartData.totals.total,
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
        await clearCart();
        appliedDiscount = null;
        processPaymentStatus = 'success';
    } catch (error) {
        console.error('Payment processing error:', error);
        alert('An unexpected error occurred during payment processing.');
        processPaymentStatus = 'error';
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

	async function handleNewPriceSubmit() {
		if (!itemForPriceOverride) return;
		// Note: Price override functionality would need to be implemented in cart remote
		// For now, we'll update the quantity to trigger a recalculation
		await updateCartItemQuantity({ 
			cart_item_id: itemForPriceOverride.cart_item_id, 
			quantity: itemForPriceOverride.quantity 
		});
		isPriceInputOpen = false;
		itemForPriceOverride = null;
	}

	function handleRemoveItem(item: EnhancedCartItem) {
		requestManagerOverride(
			'Manager Override Required',
			'Please enter manager PIN to remove this item.',
			async () => await removeCartItem({ cart_item_id: item.cart_item_id })
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

	{#await cartQuery then cartData}
		<PaymentModal
			bind:open={showPaymentModal}
			totalAmount={cartData.totals.total}
			onConfirm={handlePaymentConfirm}
			onCancel={() => (showPaymentModal = false)}
		/>
	{/await}

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
					{#await productsQuery then products}
						{@const filteredProducts = products.filter((product: any) => {
							if (!product || product.is_archived) return false;
							const matchesCategory = activeCategory === 'All' || product.category_id === activeCategory;
							const lowerSearch = searchTerm.toLowerCase();
							const matchesSearch = lowerSearch
								? product.name.toLowerCase().includes(lowerSearch) || product.sku.toLowerCase().includes(lowerSearch)
								: true;
							return matchesCategory && matchesSearch;
						})}
						<BarcodeInput
							placeholder="Scan barcode..."
							onscan={(code: string) => {
								const hit = filteredProducts.find((p: any) => p.sku === code || p.id === code);
								if (hit) handleProductClick(hit);
							}}
						/>
					{/await}
				</div>
			</Card.Header>
			<Card.Content>
				{#await productsQuery then products}
					{@const categories = [
						'All',
						...new Set(products.map((p: any) => p.category_id).filter((c: any): c is string => !!c))
					]}
					<div class="flex gap-2 mb-4 flex-wrap">
						{#each categories as category}
							<Button
								variant={activeCategory === category ? 'default' : 'outline'}
								onclick={() => (activeCategory = category)}>{category}</Button
							>
						{/each}
					</div>
				{/await}
			</Card.Content>
		</Card.Root>
		{#await productsQuery}
			<div class="flex items-center justify-center h-64">
				<div class="loading-spinner">Loading products...</div>
			</div>
		{:then products}
			{@const categories = [
				'All',
				...new Set(products.map((p: any) => p.category_id).filter((c: any): c is string => !!c))
			]}
			{@const filteredProducts = products.filter((product: any) => {
				if (!product || product.is_archived) return false;
				const matchesCategory = activeCategory === 'All' || product.category_id === activeCategory;
				const lowerSearch = searchTerm.toLowerCase();
				const matchesSearch = lowerSearch
					? product.name.toLowerCase().includes(lowerSearch) || product.sku.toLowerCase().includes(lowerSearch)
					: true;
				return matchesCategory && matchesSearch;
			})}
			<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto pr-2 h-full">
				{#each filteredProducts as product (product.id)}
					<button
						onclick={() => handleProductClick(product)}
						class="border rounded-lg p-2 text-center hover:bg-muted transition-colors flex flex-col items-center justify-between"
					>
						<img
							src={product.image_url || '/placeholder.svg'}
							alt={product.name || 'Product'}
							class="w-24 h-24 object-cover mb-2 rounded-md"
						/>
						<span class="text-sm font-medium">{product.name || 'Unnamed Product'}</span>
						<span class="text-xs text-muted-foreground">{currency(product.selling_price || 0)}</span>
						<Badge variant={product.stock_quantity > 0 ? 'secondary' : 'destructive'}>
							{product.stock_quantity || 0} in stock
						</Badge>
					</button>
				{/each}
			</div>
		{:catch error}
			<div class="flex items-center justify-center h-64 text-red-500">
				<div>Error loading products: {error?.message}</div>
			</div>
		{/await}
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
				onclick={async () => await clearCart()}
				>Clear Cart</Button
			>
			</div>
		</header>

		<div class="flex-1 p-4 space-y-3 overflow-y-auto">
			{#await cartQuery}
				<div class="flex items-center justify-center h-full">
					<div class="loading-spinner">Loading cart...</div>
				</div>
			{:then cartData}
				{#if cartData.items.length === 0}
					<div class="flex flex-col items-center justify-center h-full text-muted-foreground">
						<p>Your cart is empty.</p>
						<p class="text-sm">Click on a product to add it.</p>
					</div>
				{:else}
					{#each cartData.items as item (item.cart_item_id)}
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
									oninput={async (e) => await updateCartItemQuantity({ 
										cart_item_id: item.cart_item_id, 
										quantity: e.currentTarget.valueAsNumber 
									})}
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
			{:catch error}
				<div class="flex items-center justify-center h-full text-red-500">
					<div>Error loading cart: {error?.message}</div>
				</div>
			{/await}
		</div>

		<footer class="p-4 mt-auto border-t space-y-3 flex-shrink-0">
			{#await cartQuery then cartData}
				<div class="flex justify-between">
					<span>Subtotal</span>
					<span>{currency(cartData.totals.subtotal)}</span>
				</div>
				<div class="flex justify-between">
					<span>Tax (12%)</span>
					<span>{currency(cartData.totals.tax)}</span>
				</div>
				{#if cartData.totals.discount_amount > 0}
					<div class="flex justify-between text-green-600">
						<span>Discount</span>
						<span>-{currency(cartData.totals.discount_amount)}</span>
					</div>
				{/if}
				<div class="flex justify-between font-bold text-lg border-t pt-2 mt-2">
					<span>Total</span>
					<span>{currency(cartData.totals.total)}</span>
				</div>
				<Button 
					class="w-full" 
					size="lg" 
					onclick={handleCharge} 
					disabled={cartData.items.length === 0 || processPaymentStatus === 'pending'}
				>
					{#if processPaymentStatus === 'pending'}
						Processing Payment...
					{:else}
						Charge
					{/if}
				</Button>
			{/await}
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
