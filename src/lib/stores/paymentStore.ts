import { writable } from 'svelte/store';

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

function createPaymentStore() {
	const { subscribe, set, update } = writable<PaymentState>(initialState);

	return {
		subscribe,
		setPaymentDetails: (details: {
			total: number;
			paymentMethod: PaymentMethod;
			cashTendered?: number;
			gcashReference?: string;
		}) => {
			update((state) => {
				const change = details.cashTendered ? details.cashTendered - details.total : 0;
				return {
					...state,
					method: details.paymentMethod,
					amount: details.total,
					cashTendered: details.cashTendered,
					gcashReference: details.gcashReference,
					change: change > 0 ? change : 0,
					isFinalized: true
				};
			});
		},
		reset: () => set(initialState)
	};
}

export const paymentStore = createPaymentStore();
