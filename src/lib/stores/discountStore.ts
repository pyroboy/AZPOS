import { writable } from 'svelte/store';
import type { Discount } from '$lib/schemas/models';

// Initial sample data for development
const initialDiscounts: Discount[] = [
	{
		id: 'd1', name: 'Employee Discount', type: 'percentage', value: 15, is_active: true,
		applicable_scope: 'all_items'
	},
	{
		id: 'd2', name: '$5 Off Coupon', type: 'fixed_amount', value: 5, is_active: true,
		applicable_scope: 'all_items'
	},
	{
		id: 'd3', name: 'Holiday Special', type: 'percentage', value: 10, is_active: false,
		applicable_scope: 'all_items'
	},
];

function createDiscountStore() {
	const store = writable<Discount[]>(initialDiscounts);
	const { subscribe, set, update } = store;

	return {
		subscribe,
		addDiscount: (newDiscountData: Omit<Discount, 'id' | 'is_active'>) => {
			const newDiscount: Discount = {
				...newDiscountData,
				id: `d${Date.now()}`,
				is_active: true,
			};
			update((items) => [...items, newDiscount]);
		},
		updateDiscount: (updatedDiscount: Discount) => {
			update((items) => items.map((d) => (d.id === updatedDiscount.id ? updatedDiscount : d)));
		},
		toggleActivation: (id: string) => {
			update((items) =>
				items.map((d) => (d.id === id ? { ...d, is_active: !d.is_active } : d))
			);
		},
		deleteDiscount: (id: string) => {
			update((items) => items.filter((d) => d.id !== id));
		},
		reset: () => set(initialDiscounts),
	};
}

export const discounts = createDiscountStore();
