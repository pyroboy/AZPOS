import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import type {
	DiscountInput,
	DiscountFilters,
	PaginatedDiscounts,
	DiscountStats,
	ValidateDiscount
} from '$lib/types/discount.schema';

/**
 * A wrapper for the onGetDiscounts telefunc to avoid SSR import issues.
 * @param {DiscountFilters} filters - The filters for getting discounts.
 * @returns {Promise<PaginatedDiscounts>} The result from the telefunc.
 */
const onGetDiscounts = async (filters: DiscountFilters): Promise<PaginatedDiscounts> => {
	const { onGetDiscounts } = await import('$lib/server/telefuncs/discount.telefunc');
	return onGetDiscounts(filters);
};

/**
 * A wrapper for the onCreateDiscount telefunc to avoid SSR import issues.
 * @param {DiscountInput} discountData - The discount data for creation.
 * @returns {Promise<any>} The result from the telefunc.
 */
const onCreateDiscount = async (discountData: DiscountInput): Promise<any> => {
	const { onCreateDiscount } = await import('$lib/server/telefuncs/discount.telefunc');
	return onCreateDiscount(discountData);
};

/**
 * A wrapper for the onValidateDiscount telefunc to avoid SSR import issues.
 * @param {ValidateDiscount} validationData - The validation data for discount.
 * @returns {Promise<any>} The result from the telefunc.
 */
const onValidateDiscount = async (validationData: ValidateDiscount): Promise<any> => {
	const { onValidateDiscount } = await import('$lib/server/telefuncs/discount.telefunc');
	return onValidateDiscount(validationData);
};

/**
 * A wrapper for the onGetDiscountStats telefunc to avoid SSR import issues.
 * @returns {Promise<DiscountStats>} The result from the telefunc.
 */
const onGetDiscountStats = async (): Promise<DiscountStats> => {
	const { onGetDiscountStats } = await import('$lib/server/telefuncs/discount.telefunc');
	return onGetDiscountStats();
};

const discountsQueryKey = ['discounts'];
const discountStatsQueryKey = ['discount-stats'];

export function useDiscounts() {
	const queryClient = useQueryClient();

	// State for filters
	let filters = $state<DiscountFilters>({
		page: 1,
		limit: 20,
		sort_by: 'created_at',
		sort_order: 'desc'
	});

	// Query for paginated discounts
	const discountsQuery = createQuery<PaginatedDiscounts>({
		queryKey: $derived([...discountsQueryKey, filters]),
		queryFn: () => onGetDiscounts(filters)
	});

	// Query for discount statistics
	const statsQuery = createQuery<DiscountStats>({
		queryKey: discountStatsQueryKey,
		queryFn: onGetDiscountStats
	});

	// Mutation to create discount
	const createDiscountMutation = createMutation({
		mutationFn: (discountData: DiscountInput) => onCreateDiscount(discountData),
		onSuccess: (newDiscount) => {
			// Invalidate and refetch discounts
			queryClient.invalidateQueries({ queryKey: discountsQueryKey });
			queryClient.invalidateQueries({ queryKey: discountStatsQueryKey });

			// Optimistically add to cache
			queryClient.setQueryData<PaginatedDiscounts>([...discountsQueryKey, filters], (old) => {
				if (!old) return old;
				return {
					...old,
					discounts: [newDiscount, ...old.discounts]
				};
			});
		}
	});

	// Mutation to validate discount
	const validateDiscountMutation = createMutation({
		mutationFn: (validationData: ValidateDiscount) => onValidateDiscount(validationData)
	});

	// Derived reactive state
	const discounts = $derived(discountsQuery.data?.discounts || []);
	const pagination = $derived(discountsQuery.data?.pagination);
	const stats = $derived(statsQuery.data);

	// Filtered discounts
	const activeDiscounts = $derived(
		discounts.filter((discount: { end_date: string | number | Date; is_active: boolean }) => {
			const now = new Date();
			const endDate = new Date(discount.end_date);
			return discount.is_active && endDate > now;
		})
	);

	const expiredDiscounts = $derived(
		discounts.filter((discount: { end_date: string | number | Date }) => {
			const now = new Date();
			const endDate = new Date(discount.end_date);
			return endDate <= now;
		})
	);

	const codeBasedDiscounts = $derived(
		discounts.filter((discount: { code: string }) => discount.code)
	);

	const automaticDiscounts = $derived(
		discounts.filter((discount: { code: string }) => !discount.code)
	);

	// Helper functions
	function updateFilters(newFilters: Partial<DiscountFilters>) {
		filters = { ...filters, ...newFilters };
	}

	function resetFilters() {
		filters = {
			page: 1,
			limit: 20,
			sort_by: 'created_at',
			sort_order: 'desc'
		};
	}

	function goToPage(page: number) {
		updateFilters({ page });
	}

	function setSearch(search: string) {
		updateFilters({ search: search || undefined, page: 1 });
	}

	function setTypeFilter(type: DiscountFilters['type']) {
		updateFilters({ type, page: 1 });
	}

	function setActiveFilter(is_active: boolean | undefined) {
		updateFilters({ is_active, page: 1 });
	}

	function setSorting(
		sort_by: DiscountFilters['sort_by'],
		sort_order: DiscountFilters['sort_order']
	) {
		updateFilters({ sort_by, sort_order, page: 1 });
	}

	// Validation helpers
	function validateDiscountCode(code: string, orderAmount: number, customerId?: string) {
		return validateDiscountMutation.mutateAsync({
			code,
			order_amount: orderAmount,
			customer_id: customerId
		});
	}

	function validateDiscountById(discountId: string, orderAmount: number, customerId?: string) {
		return validateDiscountMutation.mutateAsync({
			discount_id: discountId,
			order_amount: orderAmount,
			customer_id: customerId
		});
	}

	return {
		// Queries and their states
		discountsQuery,
		statsQuery,

		// Reactive data
		discounts,
		pagination,
		stats,

		// Filtered data
		activeDiscounts,
		expiredDiscounts,
		codeBasedDiscounts,
		automaticDiscounts,

		// Current filters
		filters: $derived(filters),

	// Mutations
	createDiscount: createDiscountMutation.mutate,
	addDiscount: createDiscountMutation.mutate,
	createDiscountAsync: createDiscountMutation.mutateAsync,
	createDiscountStatus: $derived(createDiscountMutation.status),

	// Placeholder methods - these would need proper implementations
	updateDiscount: (discount: Record<string, unknown>) => {
		console.log('updateDiscount not implemented', discount);
	},
	deleteDiscount: (id: string) => {
		console.log('deleteDiscount not implemented', id);
	},
	toggleActivation: (id: string) => {
		console.log('toggleActivation not implemented', id);
	},

	validateDiscountCode,
	validateDiscountById,
	validateDiscountStatus: $derived(validateDiscountMutation.status),
	validationResult: $derived(validateDiscountMutation.data),

		// Filter helpers
		updateFilters,
		resetFilters,
		goToPage,
		setSearch,
		setTypeFilter,
		setActiveFilter,
		setSorting,

		// Loading states
		isLoading: $derived(discountsQuery.isPending),
		isError: $derived(discountsQuery.isError),
		error: $derived(discountsQuery.error),

		// Stats loading
		isStatsLoading: $derived(statsQuery.isPending),
		statsError: $derived(statsQuery.error)
	};
}
