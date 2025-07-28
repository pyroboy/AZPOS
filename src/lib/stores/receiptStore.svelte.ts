import type { CartItem } from '$lib/schemas/models';

export type ReceiptData = {
	transactionId: string;
	date: string | Date;
	timestamp: Date;
	items: (CartItem & { name: string })[];
	subtotal: number;
	tax: number;
	discount: number;
	total: number;
	paymentMethod: 'cash' | 'gcash';
	amountPaid: number;
	change: number;
	cashier: string;
	customer?: string;
	gcashReference?: string;
};

// Use $state for receipt data
export let receiptData = $state<ReceiptData | null>(null);

// Derived state for receipt visibility
export const isReceiptVisible = $derived(receiptData !== null);

// Export functions that directly mutate the state
export function showReceipt(data: ReceiptData) {
	receiptData = data;
}

export function hideReceipt() {
	receiptData = null;
}
