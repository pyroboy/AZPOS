import type { ReturnRecord } from '$lib/schemas/models';
import { writable, get } from 'svelte/store';
// Define the input type for creating a new return, omitting generated fields
export type NewReturnInput = Omit<ReturnRecord, 'id' | 'return_date' | 'status'>;

function createReturnStore() {
	const store = writable<ReturnRecord[]>([]);
	const { subscribe, set, update } = store;

	function addReturn(returnData: NewReturnInput) {
		const newReturn: ReturnRecord = {
			...returnData,
			id: `RTN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
			return_date: new Date().toISOString(),
			status: 'pending'
			
		};
		update((returns) => [newReturn, ...returns]);
		return newReturn;
	}

	function approveReturn(id: string) {
		update((returns) => returns.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));
	}

	function rejectReturn(id: string) {
		update((returns) => returns.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r)));
	}

	function getReturnById(id: string) {
		const returns = get(store);
		return returns.find((r: ReturnRecord) => r.id === id);
	}

	return {
		subscribe,
		addReturn,
		approveReturn,
		rejectReturn,
		getReturnById,
		set: (newReturns: ReturnRecord[]) => {
			set(newReturns);
		},
		reset: () => {
			set([]);
		}
	};
}

export const returns = createReturnStore();
