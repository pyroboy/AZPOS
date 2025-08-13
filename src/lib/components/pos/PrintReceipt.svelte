<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import Receipt from './Receipt.svelte';
	import { generateReceipt } from '$lib/remote/receipts.remote';
	import { Printer, X } from 'lucide-svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import type { GeneratedReceipt } from '$lib/types/receipt.schema';

	// Props according to the new pattern
	type Props = {
		open: boolean;
		onClose?: () => void;
	};

	let { open, onClose }: Props = $props();

	// Modern Svelte 5 state management
	let generateReceiptStatus = $state<'idle' | 'pending' | 'success' | 'error'>('idle');

	function printReceipt() {
		const printableArea = document.getElementById('receipt-printable-area');
		if (!printableArea) return;

		// Create a new window to print the content
		const printWindow = window.open('', '_blank', 'height=600,width=800');

		if (printWindow) {
			printWindow.document.write('<html><head><title>Print Receipt</title>');
			// You can link to an external stylesheet for printing if needed
			// For simplicity, we'll inject basic styles here.
			printWindow.document.write(`
        <style>
          body { font-family: 'Courier New', monospace; margin: 0; }
          @media print {
            @page { 
              size: 80mm auto; /* Adjust for typical thermal printer roll width */
              margin: 2mm; 
            }
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      `);
			printWindow.document.write('</head><body>');
			printWindow.document.write(printableArea.innerHTML);
			printWindow.document.write('</body></html>');
			printWindow.document.close();
			printWindow.focus();
			printWindow.print();
			// printWindow.close(); // Closing automatically might not work in all browsers
		} else {
			alert('Could not open print window. Please check your browser pop-up settings.');
		}
	}

	function handleClose() {
		onClose?.();
	}
</script>

<Dialog.Root
	open={open}
	onOpenChange={(o) => {
		if (!o) handleClose();
	}}
>
	<!-- Display modal based on generateReceiptStatus -->
		<Dialog.Content class="sm:max-w-md bg-gray-100">
			<Dialog.Header>
				<Dialog.Title>Receipt Preview</Dialog.Title>
			</Dialog.Header>

			<div
				id="receipt-printable-area"
				class="my-4 max-h-[60vh] overflow-y-auto p-2 bg-white rounded-sm"
			>
				<!-- Display based on generateReceiptStatus -->
				{#if generateReceiptStatus === 'pending'}
					<p class="text-center py-8">Generating receipt...</p>
				{:else if generateReceiptStatus === 'success'}
					<div class="bg-white text-black p-4 font-mono text-xs max-w-sm mx-auto border border-dashed border-gray-400">
						<header class="text-center mb-4">
							<h1 class="text-lg font-bold uppercase">AZPOS Pharmacy</h1>
							<p>Receipt Preview</p>
							<p class="mt-2">OFFICIAL RECEIPT</p>
						</header>

						<div class="mb-4">
							<p class="text-center text-xs text-gray-600">Receipt generated successfully</p>
						</div>

						<footer class="text-center mt-4 pt-2 border-t border-dashed border-gray-400">
							<p class="italic">Thank you for your purchase!</p>
							<p class="text-xs">This serves as your official receipt.</p>
						</footer>
					</div>
				{:else if generateReceiptStatus === 'error'}
					<p class="text-center text-red-500 py-8">Failed to generate receipt. Please try again.</p>
				{:else}
					<p class="text-center py-8">No receipt to display</p>
				{/if}
			</div>

			<Dialog.Footer class="sm:justify-between {generateReceiptStatus === 'success' ? 'grid grid-cols-2' : 'flex justify-center'} gap-2">
				<div
					onclick={() => handleClose()}
					role="button"
					tabindex="0"
					onkeydown={(e) => e.key === 'Enter' && handleClose()}
				>
					<Button variant="outline" class="w-full">
						<X class="mr-2 h-4 w-4" /> Close
					</Button>
				</div>
				{#if generateReceiptStatus === 'success'}
					<div
						onclick={() => printReceipt()}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && printReceipt()}
					>
						<Button class="w-full">
							<Printer class="mr-2 h-4 w-4" /> Print Receipt
						</Button>
					</div>
				{/if}
			</Dialog.Footer>
		</Dialog.Content>
</Dialog.Root>
