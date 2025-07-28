// Define the input type for creating a new return, omitting generated fields
export type NewReturnInput = Omit<EnhancedReturnRecord, 'id' | 'return_date' | 'status'>;

// Enhanced ReturnRecord type that includes both schemas
export type EnhancedReturnRecord = {
	id: string;
	order_id: string;
	customer_name: string;
	items: { product_id: string; product_name: string; product_sku: string; quantity: number }[];
	return_date: string;
	status: 'pending' | 'approved' | 'rejected' | 'completed' | 'processing';
	reason: 'defective' | 'wrong_item' | 'changed_mind' | 'other' | 'no_longer_needed';
	notes?: string;
};

// Initial sample data
const initialReturns: EnhancedReturnRecord[] = [
	{
		id: 'RTN-001',
		order_id: 'ORD-12345',
		customer_name: 'John Doe',
		items: [
			{ product_id: 'prod1', product_name: 'Sample Product 1', product_sku: 'SKU001', quantity: 1 },
			{ product_id: 'prod2', product_name: 'Sample Product 2', product_sku: 'SKU002', quantity: 2 }
		],
		return_date: '2025-07-15T10:00:00.000Z',
		status: 'pending',
		reason: 'no_longer_needed'
	},
	{
		id: 'RTN-002',
		order_id: 'ORD-12348',
		customer_name: 'Jane Smith',
		items: [
			{ product_id: 'prod3', product_name: 'Sample Product 3', product_sku: 'SKU003', quantity: 1 }
		],
		return_date: '2025-07-16T11:30:00.000Z',
		status: 'completed',
		reason: 'wrong_item'
	}
];

/**
 * Returns store using Svelte 5 runes with closure pattern
 * Exports only the returns state, with all methods and derived states contained within
 */
function createReturnsStore() {
	// Core reactive state
	const returns = $state<EnhancedReturnRecord[]>([...initialReturns]);

	// Derived states for different return statuses
	const pendingReturns = $derived(returns.filter(r => r.status === 'pending'));
	const approvedReturns = $derived(returns.filter(r => r.status === 'approved'));
	const completedReturns = $derived(returns.filter(r => r.status === 'completed'));

	// Methods for managing returns
	function addReturn(returnData: NewReturnInput): EnhancedReturnRecord {
		const newReturn: EnhancedReturnRecord = {
			...returnData,
			id: `RTN-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
			return_date: new Date().toISOString(),
			status: 'pending'
		};
		returns.unshift(newReturn); // Add to beginning for chronological order
		return newReturn;
	}

	function approveReturn(id: string) {
		const index = returns.findIndex(r => r.id === id);
		if (index !== -1) {
			returns[index] = { ...returns[index], status: 'approved' };
		}
	}

	function rejectReturn(id: string) {
		const index = returns.findIndex(r => r.id === id);
		if (index !== -1) {
			returns[index] = { ...returns[index], status: 'rejected' };
		}
	}

	function completeReturn(id: string) {
		const index = returns.findIndex(r => r.id === id);
		if (index !== -1) {
			returns[index] = { ...returns[index], status: 'completed' };
		}
	}

	function updateReturnStatus(id: string, status: EnhancedReturnRecord['status']) {
		const index = returns.findIndex(r => r.id === id);
		if (index !== -1) {
			returns[index] = { ...returns[index], status };
		}
	}

	function getReturnById(id: string): EnhancedReturnRecord | undefined {
		return returns.find(r => r.id === id);
	}

	function setReturns(newReturns: EnhancedReturnRecord[]) {
		returns.length = 0; // Clear existing returns
		returns.push(...newReturns);
	}

	function reset() {
		returns.length = 0;
		returns.push(...initialReturns);
	}

	// Return the public API
	return {
		// Expose state
		returns,
		pendingReturns,
		approvedReturns,
		completedReturns,

		// Expose methods
		addReturn,
		approveReturn,
		rejectReturn,
		completeReturn,
		updateReturnStatus,
		getReturnById,
		setReturns,
		reset
	};
}

// Create the store instance
const returnsStore = createReturnsStore();

// Export only the returns state and methods
export const {
	returns,
	pendingReturns,
	approvedReturns,
	completedReturns,
	addReturn,
	approveReturn,
	rejectReturn,
	completeReturn,
	updateReturnStatus,
	getReturnById,
	setReturns,
	reset
} = returnsStore;
