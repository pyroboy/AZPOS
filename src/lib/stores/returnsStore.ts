import { writable } from 'svelte/store';
import { products } from './productStore';
import type { Product } from '$lib/schemas/models';
export type ReturnRecord = {
	id: string;
	order_id: string;
	customer_name: string;
	items: { product_id: string; product_name: string; product_sku: string; quantity: number }[];
	return_date: string;
	status: 'pending' | 'approved' | 'rejected' | 'completed' | 'processing';
	reason: 'defective' | 'wrong_item' | 'changed_mind' | 'other' | 'no_longer_needed';
	notes?: string;
};

function createInitialReturns(productList: Product[]): ReturnRecord[] {
	const returns: ReturnRecord[] = [];

	if (productList.length > 2) {
		returns.push({
			id: 'RTN-001',
			order_id: 'ORD-12345',
			customer_name: 'John Doe',
			items: [
				{ product_id: productList[0].id, product_name: productList[0].name, product_sku: productList[0].sku, quantity: 1 },
				{ product_id: productList[2].id, product_name: productList[2].name, product_sku: productList[2].sku, quantity: 2 }
			],
			return_date: '2025-07-15T10:00:00.000Z',
			status: 'pending',
			reason: 'defective'
		});
	}

	if (productList.length > 5) {
		returns.push({
			id: 'RTN-002',
			order_id: 'ORD-12348',
			customer_name: 'Jane Smith',
			items: [
				{ product_id: productList[5].id, product_name: productList[5].name, product_sku: productList[5].sku, quantity: 1 }
			],
			return_date: '2025-07-16T11:30:00.000Z',
			status: 'completed',
			reason: 'wrong_item'
		});
	}

	if (productList.length > 10) {
		returns.push({
			id: 'RTN-003',
			order_id: 'ORD-12350',
			customer_name: 'Emily White',
			items: [
				{ product_id: productList[8].id, product_name: productList[8].name, product_sku: productList[8].sku, quantity: 1 },
				{ product_id: productList[10].id, product_name: productList[10].name, product_sku: productList[10].sku, quantity: 1 }
			],
			return_date: '2025-07-18T14:00:00.000Z',
			status: 'processing',
			reason: 'no_longer_needed'
		});
	}

	return returns;
}

function createReturnsStore() {
	const { subscribe, set, update } = writable<ReturnRecord[]>([]);
	let initialized = false;

	products.subscribe((productList) => {
		if (!initialized && productList.length > 0) {
			set(createInitialReturns(productList));
			initialized = true;
		}
	});

	return {
		subscribe,
		// Function to update the status of a return (e.g., from pending to approved/rejected)
		updateReturnStatus: (returnId: string, status: 'approved' | 'rejected', notes?: string) => {
			update((returns) =>
				returns.map((r) =>
					r.id === returnId ? { ...r, status, notes: notes || r.notes } : r
				)
			);
		}
	};
}

export const returns = createReturnsStore();
