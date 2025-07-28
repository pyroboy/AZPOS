import type { Transaction } from '$lib/types';
import { SvelteDate } from 'svelte/reactivity';
// Define the input type for creating a new transaction, omitting fields that will be generated.
export type NewTransactionInput = Omit<Transaction, 'id' | 'created_at' | 'status'>;

// Use $state for transactions array
export const transactions = $state<Transaction[]>([]);

// Derived state for completed transactions
export const completedTransactions = $derived(transactions.filter(t => t.status === 'completed'));

// Derived state for pending transactions
export const pendingTransactions = $derived(transactions.filter(t => t.status === 'pending'));

// Export functions that directly mutate the state
export function addTransaction(transactionData: NewTransactionInput): Transaction {
    const newTransaction: Transaction = {
        ...transactionData,
        id: crypto.randomUUID(),
        created_at: new SvelteDate().toISOString(),
        status: 'completed' // Default to completed, can be updated later
    };
    transactions.push(newTransaction);
    return newTransaction;
}

export function findById(id: string): Transaction | undefined {
    return transactions.find(t => t.id === id);
}

export function updateStatus(id: string, status: 'completed' | 'voided' | 'pending') {
    const index = transactions.findIndex(t => t.id === id);
    if (index !== -1) {
        transactions[index] = { ...transactions[index], status };
    }
}

export function setTransactions(newTransactions: Transaction[]) {
    transactions.length = 0; // Clear existing transactions
    transactions.push(...newTransactions);
}

export function reset() {
    transactions.length = 0;
}
