import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { SvelteDate } from 'svelte/reactivity';

// Dynamic import wrappers for Telefunc functions (avoids SSR import issues)
const onGetProductBatches = async (filters?: ProductBatchFilters): Promise<PaginatedProductBatches> => {
	const { onGetProductBatches } = await import('$lib/server/telefuncs/productBatch.telefunc');
	return onGetProductBatches(filters);
};

const onGetProductBatchById = async (batchId: string): Promise<ProductBatch | null> => {
	const { onGetProductBatchById } = await import('$lib/server/telefuncs/productBatch.telefunc');
	return onGetProductBatchById(batchId);
};

const onCreateProductBatch = async (batchData: ProductBatchInput): Promise<ProductBatch> => {
	const { onCreateProductBatch } = await import('$lib/server/telefuncs/productBatch.telefunc');
	return onCreateProductBatch(batchData);
};

const onUpdateProductBatch = async (batchId: string, batchData: Partial<ProductBatchInput>): Promise<ProductBatch> => {
	const { onUpdateProductBatch } = await import('$lib/server/telefuncs/productBatch.telefunc');
	return onUpdateProductBatch(batchId, batchData);
};

const onDeleteProductBatch = async (batchId: string): Promise<void> => {
	const { onDeleteProductBatch } = await import('$lib/server/telefuncs/productBatch.telefunc');
	return onDeleteProductBatch(batchId);
};

const onGetBatchesByProduct = async (productId: string): Promise<ProductBatch[]> => {
	const { onGetBatchesByProduct } = await import('$lib/server/telefuncs/productBatch.telefunc');
	return onGetBatchesByProduct(productId);
};

const onGetExpiringBatches = async (): Promise<ProductBatch[]> => {
	const { onGetExpiringBatches } = await import('$lib/server/telefuncs/productBatch.telefunc');
	return onGetExpiringBatches();
};
import type {
	ProductBatch,
	ProductBatchInput,
	ProductBatchFilters,
	PaginatedProductBatches
} from '$lib/types/productBatch.schema';

// Query keys for consistent cache management
const productBatchQueryKeys = {
	all: ['productBatches'] as const,
	lists: () => [...productBatchQueryKeys.all, 'list'] as const,
	list: (filters?: ProductBatchFilters) => [...productBatchQueryKeys.lists(), filters] as const,
	details: () => [...productBatchQueryKeys.all, 'detail'] as const,
	detail: (id: string) => [...productBatchQueryKeys.details(), id] as const,
	byProduct: (productId: string) => [...productBatchQueryKeys.all, 'byProduct', productId] as const,
	expiring: () => [...productBatchQueryKeys.all, 'expiring'] as const
};

export function useProductBatches(filters?: ProductBatchFilters) {
	const queryClient = useQueryClient();

	// Query to fetch paginated product batches with filters
	const batchesQuery = createQuery<PaginatedProductBatches>({
		queryKey: productBatchQueryKeys.list(filters),
		queryFn: () => onGetProductBatches(filters),
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10 // 10 minutes
	});

	// Query to fetch expiring batches
	const expiringBatchesQuery = createQuery<ProductBatch[]>({
		queryKey: productBatchQueryKeys.expiring(),
		queryFn: () => onGetExpiringBatches(),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15 // 15 minutes
	});

	// Mutation to create a new product batch
	const createBatchMutation = createMutation({
		mutationFn: (batchData: ProductBatchInput) => onCreateProductBatch(batchData),
		onSuccess: (newBatch) => {
			// Invalidate and refetch batches list
			queryClient.invalidateQueries({ queryKey: productBatchQueryKeys.lists() });
			queryClient.invalidateQueries({ queryKey: productBatchQueryKeys.expiring() });
			queryClient.invalidateQueries({
				queryKey: productBatchQueryKeys.byProduct(newBatch.product_id)
			});

			// Optimistically add the new batch to cache
			queryClient.setQueryData<PaginatedProductBatches>(
				productBatchQueryKeys.list(filters),
				(oldData) => {
					if (!oldData)
						return {
							batches: [newBatch],
							pagination: { page: 1, limit: 20, total: 1, total_pages: 1, has_more: false }
						};
					return {
						...oldData,
						batches: [newBatch, ...oldData.batches],
						pagination: {
							...oldData.pagination,
							total: oldData.pagination.total + 1
						}
					};
				}
			);
		},
		onError: (error) => {
			console.error('Failed to create product batch:', error);
		}
	});

	// Mutation to update a product batch
	const updateBatchMutation = createMutation({
		mutationFn: ({
			batchId,
			batchData
		}: {
			batchId: string;
			batchData: Partial<ProductBatchInput>;
		}) => onUpdateProductBatch(batchId, batchData),
		onSuccess: (updatedBatch) => {
			// Update the specific batch in all relevant queries
			queryClient.setQueryData<PaginatedProductBatches>(
				productBatchQueryKeys.list(filters),
				(oldData) => {
					if (!oldData) return oldData;
					return {
						...oldData,
						batches: oldData.batches.map((batch) =>
							batch.id === updatedBatch.id ? updatedBatch : batch
						)
					};
				}
			);

			// Update detail cache if it exists
			queryClient.setQueryData(productBatchQueryKeys.detail(updatedBatch.id), updatedBatch);

			// Invalidate related queries
			queryClient.invalidateQueries({ queryKey: productBatchQueryKeys.expiring() });
			queryClient.invalidateQueries({
				queryKey: productBatchQueryKeys.byProduct(updatedBatch.product_id)
			});
		},
		onError: (error) => {
			console.error('Failed to update product batch:', error);
		}
	});

	// Mutation to delete a product batch
	const deleteBatchMutation = createMutation({
		mutationFn: (batchId: string) => onDeleteProductBatch(batchId),
		onSuccess: (_, batchId) => {
			// Remove from all lists
			queryClient.setQueryData<PaginatedProductBatches>(
				productBatchQueryKeys.list(filters),
				(oldData) => {
					if (!oldData) return oldData;
					return {
						...oldData,
						batches: oldData.batches.filter((batch) => batch.id !== batchId),
						pagination: {
							...oldData.pagination,
							total: oldData.pagination.total - 1
						}
					};
				}
			);

			// Remove from detail cache
			queryClient.removeQueries({ queryKey: productBatchQueryKeys.detail(batchId) });

			// Invalidate related queries
			queryClient.invalidateQueries({ queryKey: productBatchQueryKeys.expiring() });
		},
		onError: (error) => {
			console.error('Failed to delete product batch:', error);
		}
	});

	// Derived reactive state using Svelte 5 runes
	const batches = $derived(batchesQuery.data?.batches ?? []);
	const pagination = $derived(batchesQuery.data?.pagination);
	const expiringBatches = $derived(expiringBatchesQuery.data ?? []);

	// Derived filtered states
	const activeBatches = $derived(batches.filter((b: ProductBatch) => b.quantity_on_hand > 0));
	const expiredBatches = $derived(
		batches.filter((b: ProductBatch) => {
			if (!b.expiration_date) return false;
			return new SvelteDate(b.expiration_date) < new SvelteDate();
		})
	);
	const nearExpiryBatches = $derived(
		batches.filter((b: ProductBatch) => {
			if (!b.expiration_date) return false;
			const expiryDate = new SvelteDate(b.expiration_date);
			const thirtyDaysFromNow = new SvelteDate();
			thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
			return expiryDate < thirtyDaysFromNow && expiryDate >= new SvelteDate();
		})
	);

	// Loading and error states
	const isLoading = $derived(batchesQuery.isPending);
	const isError = $derived(batchesQuery.isError);
	const error = $derived(batchesQuery.error);

	const isExpiringLoading = $derived(expiringBatchesQuery.isPending);
	const isExpiringError = $derived(expiringBatchesQuery.isError);

	// Mutation states
	const isCreating = $derived(createBatchMutation.isPending);
	const isUpdating = $derived(updateBatchMutation.isPending);
	const isDeleting = $derived(deleteBatchMutation.isPending);

	const createError = $derived(createBatchMutation.error);
	const updateError = $derived(updateBatchMutation.error);
	const deleteError = $derived(deleteBatchMutation.error);

return {
        // Queries
        batchesQuery,
        expiringBatchesQuery,

        // Reactive data
        get batches() { return batches; },
        get pagination() { return pagination; },
        get expiringBatches() { return expiringBatches; },

        // Filtered data
        get activeBatches() { return activeBatches; },
        get expiredBatches() { return expiredBatches; },
        get nearExpiryBatches() { return nearExpiryBatches; },

        // Loading states
        get isLoading() { return isLoading; },
        get isError() { return isError; },
        get error() { return error; },
        get isExpiringLoading() { return isExpiringLoading; },
        get isExpiringError() { return isExpiringError; },

        // Mutations
        createBatch: createBatchMutation.mutate,
        updateBatch: updateBatchMutation.mutate,
        deleteBatch: deleteBatchMutation.mutate,

        // Mutation states
        get isCreating() { return isCreating; },
        get isUpdating() { return isUpdating; },
        get isDeleting() { return isDeleting; },

        get createError() { return createError; },
        get updateError() { return updateError; },
        get deleteError() { return deleteError; },

        // Utility functions
        refetch: () => queryClient.invalidateQueries({ queryKey: productBatchQueryKeys.lists() }),
        refetchExpiring: () =>
            queryClient.invalidateQueries({ queryKey: productBatchQueryKeys.expiring() })
    };
}

// Hook for fetching a single product batch by ID
export function useProductBatch(batchId: string) {
	const queryClient = useQueryClient();

	const batchQuery = createQuery<ProductBatch | null>({
		queryKey: productBatchQueryKeys.detail(batchId),
		queryFn: () => onGetProductBatchById(batchId),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: !!batchId
	});

	const batch = $derived(batchQuery.data);
	const isLoading = $derived(batchQuery.isPending);
	const isError = $derived(batchQuery.isError);
	const error = $derived(batchQuery.error);

	return {
		batchQuery,
		get batch() { return batch; },
		get isLoading() { return isLoading; },
		get isError() { return isError; },
		get error() { return error; },
		refetch: () =>
			queryClient.invalidateQueries({ queryKey: productBatchQueryKeys.detail(batchId) })
	};
}

// Hook for fetching batches by product ID
export function useProductBatchesByProduct(productId: string) {
	const queryClient = useQueryClient();

	const batchesQuery = createQuery<ProductBatch[]>({
		queryKey: productBatchQueryKeys.byProduct(productId),
		queryFn: () => onGetBatchesByProduct(productId),
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
		enabled: !!productId
	});

	const batches = $derived(batchesQuery.data ?? []);
	const isLoading = $derived(batchesQuery.isPending);
	const isError = $derived(batchesQuery.isError);
	const error = $derived(batchesQuery.error);

	return {
		batchesQuery,
		get batches() { return batches; },
		get isLoading() { return isLoading; },
		get isError() { return isError; },
		get error() { return error; },
		refetch: () =>
			queryClient.invalidateQueries({ queryKey: productBatchQueryKeys.byProduct(productId) })
	};
}

// Hook for optimistic batch updates
export function useOptimisticBatchUpdate() {
	const queryClient = useQueryClient();

	return {
		// Optimistically update batch quantity in cache before server response
		updateQuantityOptimistic: (batchId: string, newQuantity: number) => {
			// Update all relevant queries optimistically
			queryClient.setQueriesData<PaginatedProductBatches>(
				{ queryKey: productBatchQueryKeys.lists() },
				(oldData) => {
					if (!oldData) return oldData;
					return {
						...oldData,
						batches: oldData.batches.map((batch) =>
							batch.id === batchId
								? { ...batch, quantity_on_hand: newQuantity, updated_at: new SvelteDate().toISOString() }
								: batch
						)
					};
				}
			);

			// Update detail cache if it exists
			queryClient.setQueriesData<ProductBatch>(
				{ queryKey: productBatchQueryKeys.details() },
				(oldData) =>
					oldData?.id === batchId
						? { ...oldData, quantity_on_hand: newQuantity, updated_at: new SvelteDate().toISOString() }
						: oldData
			);
		}
	};
}
