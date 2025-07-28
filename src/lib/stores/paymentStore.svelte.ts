export type PaymentMethod = 'cash' | 'gcash';

export interface PaymentState {
	method: PaymentMethod;
	amount: number;
	cashTendered?: number;
	gcashReference?: string;
	change: number;
	isFinalized: boolean;
}

const initialState: PaymentState = {
	method: 'cash',
	amount: 0,
	change: 0,
	isFinalized: false
};

// Use $state for payment state
export const paymentState = $state<PaymentState>({ ...initialState });

// Export functions that directly mutate the state
export function setPaymentDetails(details: {
	total: number;
	paymentMethod: PaymentMethod;
	cashTendered?: number;
	gcashReference?: string;
}) {
	const change = details.cashTendered ? details.cashTendered - details.total : 0;
	
	paymentState.method = details.paymentMethod;
	paymentState.amount = details.total;
	paymentState.cashTendered = details.cashTendered;
	paymentState.gcashReference = details.gcashReference;
	paymentState.change = change > 0 ? change : 0;
	paymentState.isFinalized = true;
}

export function reset() {
	Object.assign(paymentState, initialState);
}
