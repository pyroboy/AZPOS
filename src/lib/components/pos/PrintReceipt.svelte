<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import Receipt from './Receipt.svelte';
	import type { ReceiptData } from '$lib/stores/receiptStore';
	import { Printer, X } from 'lucide-svelte';
	import * as Dialog from '$lib/components/ui/dialog';

	export let receiptData: ReceiptData | null;

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

	const dispatch = createEventDispatcher<{ close: void }>();

	function handleClose() {
		receiptData = null;
		dispatch('close');
	}

	$: open = !!receiptData;
</script>

<Dialog.Root bind:open onOpenChange={(o) => { if (!o) handleClose(); }}>
	{#if receiptData}
		<Dialog.Content class="sm:max-w-md bg-gray-100">
			<Dialog.Header>
				<Dialog.Title>Receipt Preview</Dialog.Title>
			</Dialog.Header>

						<div id="receipt-printable-area" class="my-4 max-h-[60vh] overflow-y-auto p-2 bg-white rounded-sm">
				<Receipt {...receiptData} />
			</div>

			<Dialog.Footer class="sm:justify-between grid grid-cols-2 gap-2">
												<div on:click={() => handleClose()} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && handleClose()}>
					<Button variant="outline" class="w-full">
						<X class="mr-2 h-4 w-4" /> Close
					</Button>
				</div>
												<div on:click={() => printReceipt()} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && printReceipt()}>
					<Button class="w-full">
						<Printer class="mr-2 h-4 w-4" /> Print Receipt
					</Button>
				</div>
			</Dialog.Footer>
		</Dialog.Content>
	{/if}
</Dialog.Root>
