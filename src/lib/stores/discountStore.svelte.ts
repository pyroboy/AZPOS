import type { Discount } from '$lib/schemas/models';

// Initial sample data for development
const initialDiscounts: Discount[] = [
	{
		id: 'd1',
		name: 'Employee Discount',
		type: 'percentage',
		value: 15,
		is_active: true,
		applicable_scope: 'all_items'
	},
	{
		id: 'd2',
		name: '$5 Off Coupon',
		type: 'fixed_amount',
		value: 5,
		is_active: true,
		applicable_scope: 'all_items'
	},
	{
		id: 'd3',
		name: 'Holiday Special',
		type: 'percentage',
		value: 10,
		is_active: false,
		applicable_scope: 'all_items'
	}
];

// Use $state for the discounts array
export const discounts = $state<Discount[]>([...initialDiscounts]);

// Derived state for active discounts
export const activeDiscounts = $derived(discounts.filter((d) => d.is_active));

// Export functions that directly mutate the state
export function addDiscount(newDiscountData: Omit<Discount, 'id' | 'is_active'>) {
	const newDiscount: Discount = {
		...newDiscountData,
		id: `d${Date.now()}`,
		is_active: true
	};
	discounts.push(newDiscount);
}

export function updateDiscount(updatedDiscount: Discount) {
	const index = discounts.findIndex((d) => d.id === updatedDiscount.id);
	if (index !== -1) {
		discounts[index] = updatedDiscount;
	}
}

export function toggleActivation(id: string) {
	const index = discounts.findIndex((d) => d.id === id);
	if (index !== -1) {
		discounts[index] = {
			...discounts[index],
			is_active: !discounts[index].is_active
		};
	}
}

export function deleteDiscount(id: string) {
	const index = discounts.findIndex((d) => d.id === id);
	if (index !== -1) {
		discounts.splice(index, 1);
	}
}

export function reset() {
	discounts.length = 0; // Clear existing discounts
	discounts.push(...initialDiscounts);
}

export function setDiscounts(newDiscounts: Discount[]) {
	discounts.length = 0; // Clear existing discounts
	discounts.push(...newDiscounts);
}
