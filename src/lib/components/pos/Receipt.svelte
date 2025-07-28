<script lang="ts">
	import type { CartItem } from '$lib/schemas/models';

	// Props reflecting the transaction object structure
	export let transactionId: string;
	export let items: CartItem[];
	export let subtotal: number;
	export let tax: number;
	export let discount: number;
	export let total: number;
	export let paymentMethod: 'cash' | 'gcash';
	export let cashTendered: number | undefined = undefined;
	export let gcashReference: string | undefined = undefined;
	export let customerName: string | undefined = undefined;
	export let timestamp: Date;

	// Placeholder for QR code generation library
	// e.g., import qr from 'qrcode';
	// let qrCodeUrl: string;
	// onMount(async () => {
	//   qrCodeUrl = await qr.toDataURL(transactionId);
	// });

	const storeInfo = {
		name: 'AZPOS Pharmacy',
		address: '123 Health St, Wellness City, 1001',
		phone: '(012) 345-6789',
		tin: '000-123-456-789'
	};

	$: change = cashTendered && cashTendered > total ? cashTendered - total : 0;
</script>

<div
	id="receipt-printable-area"
	class="bg-white text-black p-4 font-mono text-xs max-w-sm mx-auto border border-dashed border-gray-400"
>
	<header class="text-center mb-4">
		<h1 class="text-lg font-bold uppercase">{storeInfo.name}</h1>
		<p>{storeInfo.address}</p>
		<p>{storeInfo.phone}</p>
		<p>TIN: {storeInfo.tin}</p>
		<p class="mt-2">OFFICIAL RECEIPT</p>
	</header>

	<section class="mb-2 border-t border-b border-dashed border-gray-400 py-2">
		<div class="flex justify-between">
			<span>Date: {new Intl.DateTimeFormat('en-US').format(timestamp)}</span>
			<span
				>Time: {new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(
					timestamp
				)}</span
			>
		</div>
		<div class="flex justify-between">
			<span>Transaction #:</span>
			<span class="truncate">{transactionId}</span>
		</div>
		{#if customerName}
			<div class="flex justify-between">
				<span>Customer:</span>
				<span>{customerName}</span>
			</div>
		{/if}
	</section>

	<table class="w-full mb-2">
		<thead>
			<tr class="border-b border-dashed border-gray-400">
				<th class="text-left">QTY</th>
				<th class="text-left">ITEM</th>
				<th class="text-right">PRICE</th>
				<th class="text-right">TOTAL</th>
			</tr>
		</thead>
		<tbody>
			{#each items as item}
				<tr>
					<td class="align-top">{item.quantity}x</td>
					<td class="w-full pr-1">
						{item.name}
						{#if item.discount}
							<span class="block text-xs italic">(-₱{item.discount.toFixed(2)})</span>
						{/if}
					</td>
					<td class="text-right align-top pr-1">{item.price.toFixed(2)}</td>
					<td class="text-right align-top">{(item.quantity * item.price).toFixed(2)}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<section class="border-t border-dashed border-gray-400 pt-2 space-y-1">
		<div class="flex justify-between">
			<span>Subtotal:</span>
			<span>₱{subtotal.toFixed(2)}</span>
		</div>
		<div class="flex justify-between">
			<span>Discount:</span>
			<span>-₱{discount.toFixed(2)}</span>
		</div>
		<div class="flex justify-between">
			<span>VAT (12%):</span>
			<span>₱{tax.toFixed(2)}</span>
		</div>
		<div
			class="flex justify-between font-bold text-lg border-t border-dashed border-gray-400 mt-2 pt-2"
		>
			<span>TOTAL:</span>
			<span>₱{total.toFixed(2)}</span>
		</div>
	</section>

	<section class="border-t border-dashed border-gray-400 mt-2 pt-2">
		<div class="flex justify-between">
			<span>Payment Method:</span>
			<span class="uppercase">{paymentMethod}</span>
		</div>
		{#if paymentMethod === 'cash'}
			<div class="flex justify-between">
				<span>Cash Tendered:</span>
				<span>₱{cashTendered?.toFixed(2) ?? '0.00'}</span>
			</div>
			<div class="flex justify-between font-bold">
				<span>Change:</span>
				<span>₱{change.toFixed(2)}</span>
			</div>
		{/if}
		{#if paymentMethod === 'gcash' && gcashReference}
			<div class="flex justify-between">
				<span>Reference #:</span>
				<span class="truncate">{gcashReference}</span>
			</div>
		{/if}
	</section>

	<footer class="text-center mt-4 pt-2 border-t border-dashed border-gray-400">
		<!-- QR Code Placeholder -->
		<div class="w-24 h-24 bg-gray-200 mx-auto my-2 flex items-center justify-center">
			<span class="text-gray-500 text-xs">QR Code</span>
			<!-- <img src={qrCodeUrl} alt="Transaction QR Code" /> -->
		</div>
		<p class="italic">Thank you for your purchase!</p>
		<p class="text-xs">This serves as your official receipt.</p>
	</footer>
</div>
