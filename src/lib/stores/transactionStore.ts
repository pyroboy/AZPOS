import type { Transaction } from '$lib/types';
import { writable, get } from 'svelte/store';

// Define the input type for creating a new transaction, omitting fields that will be generated.
export type NewTransactionInput = Omit<Transaction, 'id' | 'created_at' | 'status'>;

function createTransactionStore() {
	const { subscribe, set, update } = writable<Transaction[]>([]);

	function addTransaction(transactionData: NewTransactionInput): Transaction {
		const newTransaction: Transaction = {
			...transactionData,
			id: crypto.randomUUID(),
			created_at: new Date().toISOString(),
			status: 'completed' // Default to completed, can be updated later
		};
		update((items) => [...items, newTransaction]);
		return newTransaction;
	}

	function findById(id: string): Transaction | undefined {
		return get({ subscribe }).find((t) => t.id === id);
	}

	function updateStatus(id: string, status: 'completed' | 'voided' | 'pending') {
		update((items) => items.map((t) => (t.id === id ? { ...t, status } : t)));
	}

	return {
		subscribe,
		addTransaction,
		findById,
		updateStatus,
		set,
		reset: () => {
			set([]);
		}
	};
}

export const transactions = createTransactionStore();
