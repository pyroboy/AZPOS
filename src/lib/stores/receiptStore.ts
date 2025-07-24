import { writable } from 'svelte/store';
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

const { subscribe, set } = writable<ReceiptData | null>(null);

export const receiptStore = {
  subscribe,
  showReceipt: (data: ReceiptData) => set(data),
  hideReceipt: () => set(null)
};
