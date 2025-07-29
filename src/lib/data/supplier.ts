import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';

// Dynamic import wrappers for Telefunc functions (avoids SSR import issues)
/**
 * A wrapper for the onGetSuppliers telefunc to avoid SSR import issues.
 * @param {SupplierFilters} filters - The parameters for the telefunc.
 * @returns {Promise<PaginatedSuppliers>} The result from the telefunc.
 */
const onGetSuppliers = async (filters?: SupplierFilters): Promise<PaginatedSuppliers> => {
	const { onGetSuppliers } = await import('$lib/server/telefuncs/supplier.telefunc.js');
	return onGetSuppliers(filters);
};

/**
 * A wrapper for the onGetSupplierById telefunc to avoid SSR import issues.
 * @param {string} id - The parameters for the telefunc.
 * @returns {Promise<Supplier>} The result from the telefunc.
 */
const onGetSupplierById = async (id: string): Promise<Supplier | null> => {
	const { onGetSupplierById } = await import('$lib/server/telefuncs/supplier.telefunc.js');
	return onGetSupplierById(id);
};

/**
 * A wrapper for the onCreateSupplier telefunc to avoid SSR import issues.
 * @param {SupplierInput} supplierData - The parameters for the telefunc.
 * @returns {Promise<Supplier>} The result from the telefunc.
 */
const onCreateSupplier = async (supplierData: SupplierInput): Promise<Supplier> => {
	const { onCreateSupplier } = await import('$lib/server/telefuncs/supplier.telefunc.js');
	return onCreateSupplier(supplierData);
};

/**
 * A wrapper for the onUpdateSupplier telefunc to avoid SSR import issues.
 * @param {string} supplierId - The parameters for the telefunc.
 * @param {Partial<SupplierInput>} supplierData - The parameters for the telefunc.
 * @returns {Promise<Supplier>} The result from the telefunc.
 */
const onUpdateSupplier = async (supplierId: string, supplierData: Partial<SupplierInput>): Promise<Supplier> => {
	const { onUpdateSupplier } = await import('$lib/server/telefuncs/supplier.telefunc.js');
	return onUpdateSupplier(supplierId, supplierData);
};

/**
 * A wrapper for the onGetSupplierStats telefunc to avoid SSR import issues.
 * @param {any} params - The parameters for the telefunc.
 * @returns {Promise<SupplierStats>} The result from the telefunc.
 */
const onGetSupplierStats = async (): Promise<SupplierStats> => {
	const { onGetSupplierStats } = await import('$lib/server/telefuncs/supplier.telefunc.js');
	return onGetSupplierStats();
};

/**
 * A wrapper for the onGetSupplierPerformance telefunc to avoid SSR import issues.
 * @param {string} id - The parameters for the telefunc.
 * @param {string} period - The parameters for the telefunc.
 * @returns {Promise<SupplierPerformance>} The result from the telefunc.
 */
const onGetSupplierPerformance = async (id: string, period: 'month' | 'quarter' | 'year'): Promise<SupplierPerformance> => {
	const { onGetSupplierPerformance } = await import('$lib/server/telefuncs/supplier.telefunc.js');
	return onGetSupplierPerformance(id, period);
};

/**
 * A wrapper for the onGetSupplierProducts telefunc to avoid SSR import issues.
 * @param {string} id - The parameters for the telefunc.
 * @returns {Promise<SupplierProduct[]>} The result from the telefunc.
 */
const onGetSupplierProducts = async (id: string): Promise<SupplierProduct[]> => {
	const { onGetSupplierProducts } = await import('$lib/server/telefuncs/supplier.telefunc.js');
	return onGetSupplierProducts(id);
};

/**
 * A wrapper for the onDeleteSupplier telefunc to avoid SSR import issues.
 * @param {string} supplierId - The parameters for the telefunc.
 * @returns {Promise<any>} The result from the telefunc.
 */
const onDeleteSupplier = async (supplierId: string): Promise<any> => {
	const { onDeleteSupplier } = await import('$lib/server/telefuncs/supplier.telefunc.js');
	return onDeleteSupplier(supplierId);
};

import type {
	Supplier,
	SupplierInput,
	SupplierFilters,
	PaginatedSuppliers,
	SupplierStats,
	SupplierPerformance,
	SupplierProduct
} from '$lib/types/supplier.schema';

// Query keys for consistent cache management
const supplierQueryKeys = {
	all: ['suppliers'] as const,
	lists: () => [...supplierQueryKeys.all, 'list'] as const,
	list: (filters?: SupplierFilters) => [...supplierQueryKeys.lists(), filters] as const,
	details: () => [...supplierQueryKeys.all, 'detail'] as const,
	detail: (id: string) => [...supplierQueryKeys.details(), id] as const,
	stats: () => [...supplierQueryKeys.all, 'stats'] as const,
	performance: (id: string, period: string) =>
		[...supplierQueryKeys.all, 'performance', id, period] as const,
	products: (id: string) => [...supplierQueryKeys.all, 'products', id] as const
};

export function useSuppliers(filters?: SupplierFilters) {
	const queryClient = useQueryClient();

	// Query to fetch paginated suppliers with filters
	const suppliersQuery = createQuery<PaginatedSuppliers>({
		queryKey: supplierQueryKeys.list(filters),
		queryFn: () => onGetSuppliers(filters),
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10 // 10 minutes
	});

	// Query to fetch supplier statistics
	const statsQuery = createQuery<SupplierStats>({
		queryKey: supplierQueryKeys.stats(),
		queryFn: onGetSupplierStats,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15 // 15 minutes
	});

	// Mutation to create a new supplier
	const createSupplierMutation = createMutation({
		mutationFn: (supplierData: SupplierInput) => onCreateSupplier(supplierData),
		onSuccess: (newSupplier) => {
			// Invalidate and refetch suppliers list
			queryClient.invalidateQueries({ queryKey: supplierQueryKeys.lists() });
			queryClient.invalidateQueries({ queryKey: supplierQueryKeys.stats() });

			// Optimistically add the new supplier to cache
			queryClient.setQueryData<PaginatedSuppliers>(supplierQueryKeys.list(filters), (oldData) => {
				if (!oldData)
					return {
						suppliers: [newSupplier],
						pagination: { page: 1, limit: 20, total: 1, total_pages: 1, has_more: false }
					};
				return {
					...oldData,
					suppliers: [newSupplier, ...oldData.suppliers],
					pagination: {
						...oldData.pagination,
						total: oldData.pagination.total + 1
					}
				};
			});
		},
		onError: (error) => {
			console.error('Failed to create supplier:', error);
		}
	});

	// Mutation to update a supplier
	const updateSupplierMutation = createMutation({
		mutationFn: ({
			supplierId,
			supplierData
		}: {
			supplierId: string;
			supplierData: Partial<SupplierInput>;
		}) => onUpdateSupplier(supplierId, supplierData),
		onSuccess: (updatedSupplier) => {
			// Update the specific supplier in all relevant queries
			queryClient.setQueryData<PaginatedSuppliers>(supplierQueryKeys.list(filters), (oldData) => {
				if (!oldData) return oldData;
				return {
					...oldData,
					suppliers: oldData.suppliers.map((supplier) =>
						supplier.id === updatedSupplier.id ? updatedSupplier : supplier
					)
				};
			});

			// Update detail cache if it exists
			queryClient.setQueryData(supplierQueryKeys.detail(updatedSupplier.id), updatedSupplier);

			// Invalidate stats to get fresh calculations
			queryClient.invalidateQueries({ queryKey: supplierQueryKeys.stats() });
		},
		onError: (error) => {
			console.error('Failed to update supplier:', error);
		}
	});

	// Mutation to delete a supplier
	const deleteSupplierMutation = createMutation({
		mutationFn: (supplierId: string) => onDeleteSupplier(supplierId),
		onSuccess: (_, supplierId) => {
			// Update supplier to inactive in cache
			queryClient.setQueryData<PaginatedSuppliers>(supplierQueryKeys.list(filters), (oldData) => {
				if (!oldData) return oldData;
				return {
					...oldData,
					suppliers: oldData.suppliers.map((supplier) =>
						supplier.id === supplierId ? { ...supplier, is_active: false } : supplier
					)
				};
			});

			// Update detail cache to show inactive status
			queryClient.setQueryData<Supplier>(supplierQueryKeys.detail(supplierId), (oldData) =>
				oldData ? { ...oldData, is_active: false } : oldData
			);

			// Invalidate stats
			queryClient.invalidateQueries({ queryKey: supplierQueryKeys.stats() });
		},
		onError: (error) => {
			console.error('Failed to delete supplier:', error);
		}
	});

	// Derived reactive state using Svelte 5 runes
	const suppliers = $derived(suppliersQuery.data?.suppliers ?? []);
	const pagination = $derived(suppliersQuery.data?.pagination);
	const stats = $derived(statsQuery.data);

	// Derived filtered states
	const activeSuppliers = $derived(suppliers.filter((s: Supplier) => s.is_active));
	const inactiveSuppliers = $derived(suppliers.filter((s: Supplier) => !s.is_active));
	const suppliersWithProducts = $derived(
		suppliers.filter(() => {
			// This would need to be enhanced with actual product count data
			return true; // Placeholder
		})
	);

	// Loading and error states
	const isLoading = $derived(suppliersQuery.isPending);
	const isError = $derived(suppliersQuery.isError);
	const error = $derived(suppliersQuery.error);

	const isStatsLoading = $derived(statsQuery.isPending);
	const isStatsError = $derived(statsQuery.isError);

	return {
		// Queries
		suppliersQuery,
		statsQuery,

		// Reactive data
		suppliers,
		pagination,
		stats,

		// Filtered data
		activeSuppliers,
		inactiveSuppliers,
		suppliersWithProducts,

		// Loading states
		isLoading,
		isError,
		error,
		isStatsLoading,
		isStatsError,

		// Mutations
		createSupplier: createSupplierMutation.mutate,
		updateSupplier: updateSupplierMutation.mutate,
		deleteSupplier: deleteSupplierMutation.mutate,

		// Mutation states
		isCreating: $derived(createSupplierMutation.isPending),
		isUpdating: $derived(updateSupplierMutation.isPending),
		isDeleting: $derived(deleteSupplierMutation.isPending),

		createError: $derived(createSupplierMutation.error),
		updateError: $derived(updateSupplierMutation.error),
		deleteError: $derived(deleteSupplierMutation.error),

		// Utility functions
		refetch: () => queryClient.invalidateQueries({ queryKey: supplierQueryKeys.lists() }),
		refetchStats: () => queryClient.invalidateQueries({ queryKey: supplierQueryKeys.stats() })
	};
}

// Hook for fetching a single supplier by ID
export function useSupplier(supplierId: string) {
	const queryClient = useQueryClient();

	const supplierQuery = createQuery<Supplier | null>({
		queryKey: supplierQueryKeys.detail(supplierId),
		queryFn: () => onGetSupplierById(supplierId),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: !!supplierId
	});

	const supplier = $derived(supplierQuery.data);
	const isLoading = $derived(supplierQuery.isPending);
	const isError = $derived(supplierQuery.isError);
	const error = $derived(supplierQuery.error);

	return {
		supplierQuery,
		supplier,
		isLoading,
		isError,
		error,
		refetch: () => queryClient.invalidateQueries({ queryKey: supplierQueryKeys.detail(supplierId) })
	};
}

// Hook for fetching supplier performance metrics
export function useSupplierPerformance(supplierId: string, period: 'month' | 'quarter' | 'year') {
	const queryClient = useQueryClient();

	const performanceQuery = createQuery<SupplierPerformance>({
		queryKey: supplierQueryKeys.performance(supplierId, period),
		queryFn: () => onGetSupplierPerformance(supplierId, period),
		staleTime: 1000 * 60 * 10, // 10 minutes
		gcTime: 1000 * 60 * 30, // 30 minutes
		enabled: !!supplierId
	});

	const performance = $derived(performanceQuery.data);
	const isLoading = $derived(performanceQuery.isPending);
	const isError = $derived(performanceQuery.isError);
	const error = $derived(performanceQuery.error);

	return {
		performanceQuery,
		performance,
		isLoading,
		isError,
		error,
		refetch: () =>
			queryClient.invalidateQueries({
				queryKey: supplierQueryKeys.performance(supplierId, period)
			})
	};
}

// Hook for fetching supplier products
export function useSupplierProducts(supplierId: string) {
	const queryClient = useQueryClient();

	const productsQuery = createQuery<SupplierProduct[]>({
		queryKey: supplierQueryKeys.products(supplierId),
		queryFn: () => onGetSupplierProducts(supplierId),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: !!supplierId
	});

	const products = $derived(productsQuery.data ?? []);
	const isLoading = $derived(productsQuery.isPending);
	const isError = $derived(productsQuery.isError);
	const error = $derived(productsQuery.error);

	return {
		productsQuery,
		products,
		isLoading,
		isError,
		error,
		refetch: () =>
			queryClient.invalidateQueries({ queryKey: supplierQueryKeys.products(supplierId) })
	};
}

// Hook for optimistic supplier updates
export function useOptimisticSupplierUpdate() {
	const queryClient = useQueryClient();

	return {
		// Optimistically update supplier in cache before server response
		updateSupplierOptimistic: (supplierId: string, updates: Partial<Supplier>) => {
			// Update all relevant queries optimistically
			queryClient.setQueriesData<PaginatedSuppliers>(
				{ queryKey: supplierQueryKeys.lists() },
				(oldData) => {
					if (!oldData) return oldData;
					return {
						...oldData,
						suppliers: oldData.suppliers.map((supplier) =>
							supplier.id === supplierId
								? { ...supplier, ...updates, updated_at: new Date().toISOString() }
								: supplier
						)
					};
				}
			);

			// Update detail cache if it exists
			queryClient.setQueriesData<Supplier>({ queryKey: supplierQueryKeys.details() }, (oldData) =>
				oldData?.id === supplierId
					? { ...oldData, ...updates, updated_at: new Date().toISOString() }
					: oldData
			);
		},

		// Optimistically toggle supplier active status
		toggleActiveOptimistic: (supplierId: string, isActive: boolean) => {
			queryClient.setQueriesData<PaginatedSuppliers>(
				{ queryKey: supplierQueryKeys.lists() },
				(oldData) => {
					if (!oldData) return oldData;
					return {
						...oldData,
						suppliers: oldData.suppliers.map((supplier) =>
							supplier.id === supplierId
								? { ...supplier, is_active: isActive, updated_at: new Date().toISOString() }
								: supplier
						)
					};
				}
			);
		}
	};
}
