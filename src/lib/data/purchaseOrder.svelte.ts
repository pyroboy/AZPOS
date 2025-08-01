import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { SvelteDate } from 'svelte/reactivity';
import type {
	PurchaseOrder,
	CreatePurchaseOrder,
	UpdatePurchaseOrder,
	PurchaseOrderFilters,
	PaginatedPurchaseOrders,
	PurchaseOrderStats,
	ApprovePurchaseOrder,
	ReceiveItems
} from '$lib/types/purchaseOrder.schema';

// Dynamic import wrappers for Telefunc functions (avoids SSR import issues)
/**
 * A wrapper for the onGetPurchaseOrders telefunc to avoid SSR import issues.
 * @param {PurchaseOrderFilters} filters - The parameters for the telefunc.
 * @returns {Promise<PaginatedPurchaseOrders>} The result from the telefunc.
 */
const onGetPurchaseOrders = async (filters?: PurchaseOrderFilters): Promise<PaginatedPurchaseOrders> => {
	if (!browser) throw new Error('This function should only be used in a browser environment');
	const { onGetPurchaseOrders } = await import('$lib/server/telefuncs/purchaseOrder.telefunc');
	return onGetPurchaseOrders(filters);
};

const onGetPurchaseOrderById = async (id: string): Promise<PurchaseOrder | null> => {
	if (!browser) throw new Error('This function should only be used in a browser environment');
	const { onGetPurchaseOrderById } = await import('$lib/server/telefuncs/purchaseOrder.telefunc');
	return onGetPurchaseOrderById(id);
};

const onCreatePurchaseOrder = async (poData: CreatePurchaseOrder): Promise<PurchaseOrder> => {
	if (!browser) throw new Error('This function should only be used in a browser environment');
	const { onCreatePurchaseOrder } = await import('$lib/server/telefuncs/purchaseOrder.telefunc');
	return onCreatePurchaseOrder(poData);
};

const onUpdatePurchaseOrder = async (poId: string, poData: UpdatePurchaseOrder): Promise<PurchaseOrder> => {
	if (!browser) throw new Error('This function should only be used in a browser environment');
	const { onUpdatePurchaseOrder } = await import('$lib/server/telefuncs/purchaseOrder.telefunc');
	return onUpdatePurchaseOrder(poId, poData);
};

const onApprovePurchaseOrder = async (approvalData: ApprovePurchaseOrder): Promise<PurchaseOrder> => {
	if (!browser) throw new Error('This function should only be used in a browser environment');
	const { onApprovePurchaseOrder } = await import('$lib/server/telefuncs/purchaseOrder.telefunc');
	return onApprovePurchaseOrder(approvalData);
};

const onReceiveItems = async (receiveData: ReceiveItems): Promise<PurchaseOrder> => {
	if (!browser) throw new Error('This function should only be used in a browser environment');
	const { onReceiveItems } = await import('$lib/server/telefuncs/purchaseOrder.telefunc');
	return onReceiveItems(receiveData);
};

const onGetPurchaseOrderStats = async (): Promise<PurchaseOrderStats> => {
	if (!browser) throw new Error('This function should only be used in a browser environment');
	const { onGetPurchaseOrderStats } = await import('$lib/server/telefuncs/purchaseOrder.telefunc');
	return onGetPurchaseOrderStats();
};

// Query keys for consistent cache management
const purchaseOrderQueryKeys = {
	all: ['purchaseOrders'] as const,
	lists: () => [...purchaseOrderQueryKeys.all, 'list'] as const,
	list: (filters?: PurchaseOrderFilters) => [...purchaseOrderQueryKeys.lists(), filters] as const,
	details: () => [...purchaseOrderQueryKeys.all, 'detail'] as const,
	detail: (id: string) => [...purchaseOrderQueryKeys.details(), id] as const,
	stats: () => [...purchaseOrderQueryKeys.all, 'stats'] as const
};

export function usePurchaseOrders(filters?: PurchaseOrderFilters) {
	const queryClient = useQueryClient();

	// Query to fetch paginated purchase orders with filters
	const purchaseOrdersQuery = createQuery<PaginatedPurchaseOrders>({
		queryKey: purchaseOrderQueryKeys.list(filters),
		queryFn: () => onGetPurchaseOrders(filters),
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
		enabled: browser
	});

	// Query to fetch purchase order statistics
	const statsQuery = createQuery<PurchaseOrderStats>({
		queryKey: purchaseOrderQueryKeys.stats(),
		queryFn: onGetPurchaseOrderStats,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: browser
	});

	// Mutation to create a new purchase order
	const createPurchaseOrderMutation = createMutation({
		mutationFn: (poData: CreatePurchaseOrder) => onCreatePurchaseOrder(poData),
		onSuccess: (newPO) => {
			// Invalidate and refetch purchase orders list
			queryClient.invalidateQueries({ queryKey: purchaseOrderQueryKeys.lists() });
			queryClient.invalidateQueries({ queryKey: purchaseOrderQueryKeys.stats() });

			// Optimistically add the new PO to cache
			queryClient.setQueryData<PaginatedPurchaseOrders>(
				purchaseOrderQueryKeys.list(filters),
				(oldData) => {
					if (!oldData)
						return {
							purchase_orders: [newPO],
							pagination: { page: 1, limit: 20, total: 1, total_pages: 1, has_more: false }
						};
					return {
						...oldData,
						purchase_orders: [newPO, ...oldData.purchase_orders],
						pagination: {
							...oldData.pagination,
							total: oldData.pagination.total + 1
						}
					};
				}
			);
		},
		onError: (error) => {
			console.error('Failed to create purchase order:', error);
		}
	});

	// Mutation to update a purchase order
	const updatePurchaseOrderMutation = createMutation({
		mutationFn: ({ poId, poData }: { poId: string; poData: UpdatePurchaseOrder }) =>
			onUpdatePurchaseOrder(poId, poData),
		onSuccess: (updatedPO) => {
			// Update the specific PO in all relevant queries
			queryClient.setQueryData<PaginatedPurchaseOrders>(
				purchaseOrderQueryKeys.list(filters),
				(oldData) => {
					if (!oldData) return oldData;
					return {
						...oldData,
						purchase_orders: oldData.purchase_orders.map((po) =>
							po.id === updatedPO.id ? updatedPO : po
						)
					};
				}
			);

			// Update detail cache if it exists
			queryClient.setQueryData(purchaseOrderQueryKeys.detail(updatedPO.id), updatedPO);

			// Invalidate stats to get fresh calculations
			queryClient.invalidateQueries({ queryKey: purchaseOrderQueryKeys.stats() });
		},
		onError: (error) => {
			console.error('Failed to update purchase order:', error);
		}
	});

	// Mutation to approve/reject purchase order
	const approvePurchaseOrderMutation = createMutation({
		mutationFn: (approvalData: ApprovePurchaseOrder) => onApprovePurchaseOrder(approvalData),
		onSuccess: (updatedPO) => {
			// Update PO in all relevant caches
			queryClient.setQueryData<PaginatedPurchaseOrders>(
				purchaseOrderQueryKeys.list(filters),
				(oldData) => {
					if (!oldData) return oldData;
					return {
						...oldData,
						purchase_orders: oldData.purchase_orders.map((po) =>
							po.id === updatedPO.id ? updatedPO : po
						)
					};
				}
			);

			queryClient.setQueryData(purchaseOrderQueryKeys.detail(updatedPO.id), updatedPO);

			queryClient.invalidateQueries({ queryKey: purchaseOrderQueryKeys.stats() });
		},
		onError: (error) => {
			console.error('Failed to approve purchase order:', error);
		}
	});

	// Mutation to receive items
	const receiveItemsMutation = createMutation({
		mutationFn: (receiveData: ReceiveItems) => onReceiveItems(receiveData),
		onSuccess: (updatedPO) => {
			// Update PO in all relevant caches
			queryClient.setQueryData<PaginatedPurchaseOrders>(
				purchaseOrderQueryKeys.list(filters),
				(oldData) => {
					if (!oldData) return oldData;
					return {
						...oldData,
						purchase_orders: oldData.purchase_orders.map((po) =>
							po.id === updatedPO.id ? updatedPO : po
						)
					};
				}
			);

			queryClient.setQueryData(purchaseOrderQueryKeys.detail(updatedPO.id), updatedPO);

			// Invalidate inventory queries since items were received
			queryClient.invalidateQueries({ queryKey: ['inventory'] });
			queryClient.invalidateQueries({ queryKey: purchaseOrderQueryKeys.stats() });
		},
		onError: (error) => {
			console.error('Failed to receive items:', error);
		}
	});

	// Derived reactive state using Svelte 5 runes
	const purchaseOrders = $derived(purchaseOrdersQuery.data?.purchase_orders ?? []);
	const pagination = $derived(purchaseOrdersQuery.data?.pagination);
	const stats = $derived(statsQuery.data);

	// Derived filtered states
	const draftOrders = $derived(
		purchaseOrders.filter((po: PurchaseOrder) => po.status === 'draft')
	);
	const pendingOrders = $derived(
		purchaseOrders.filter((po: PurchaseOrder) => po.status === 'pending')
	);
	const approvedOrders = $derived(
		purchaseOrders.filter((po: PurchaseOrder) => po.status === 'approved')
	);
	const orderedOrders = $derived(
		purchaseOrders.filter((po: PurchaseOrder) => po.status === 'ordered')
	);
	const partiallyReceivedOrders = $derived(
		purchaseOrders.filter((po: PurchaseOrder) => po.status === 'partially_received')
	);
	const receivedOrders = $derived(
		purchaseOrders.filter((po: PurchaseOrder) => po.status === 'received')
	);
	const cancelledOrders = $derived(
		purchaseOrders.filter((po: PurchaseOrder) => po.status === 'cancelled')
	);

	// Loading and error states
	const isLoading = $derived(purchaseOrdersQuery.isPending);
	const isError = $derived(purchaseOrdersQuery.isError);
	const error = $derived(purchaseOrdersQuery.error);

	const isStatsLoading = $derived(statsQuery.isPending);
	const isStatsError = $derived(statsQuery.isError);

	// Mutation states
	const isCreating = $derived(createPurchaseOrderMutation.isPending);
	const isUpdating = $derived(updatePurchaseOrderMutation.isPending);
	const isApproving = $derived(approvePurchaseOrderMutation.isPending);
	const isReceiving = $derived(receiveItemsMutation.isPending);

	const createError = $derived(createPurchaseOrderMutation.error);
	const updateError = $derived(updatePurchaseOrderMutation.error);
	const approveError = $derived(approvePurchaseOrderMutation.error);
	const receiveError = $derived(receiveItemsMutation.error);

return {
        // Queries
        purchaseOrdersQuery,
        statsQuery,

        // Reactive data
        get purchaseOrders() { return purchaseOrders; },
        get pagination() { return pagination; },
        get stats() { return stats; },

        // Filtered data
        get draftOrders() { return draftOrders; },
        get pendingOrders() { return pendingOrders; },
        get approvedOrders() { return approvedOrders; },
        get orderedOrders() { return orderedOrders; },
        get partiallyReceivedOrders() { return partiallyReceivedOrders; },
        get receivedOrders() { return receivedOrders; },
        get cancelledOrders() { return cancelledOrders; },

        // Loading states
        get isLoading() { return isLoading; },
        get isError() { return isError; },
        get error() { return error; },
        get isStatsLoading() { return isStatsLoading; },
        get isStatsError() { return isStatsError; },

        // Mutations
        createPurchaseOrder: createPurchaseOrderMutation.mutate,
        updatePurchaseOrder: updatePurchaseOrderMutation.mutate,
        approvePurchaseOrder: approvePurchaseOrderMutation.mutate,
        receiveItems: receiveItemsMutation.mutate,

        // Mutation states
        get isCreating() { return isCreating; },
        get isUpdating() { return isUpdating; },
        get isApproving() { return isApproving; },
        get isReceiving() { return isReceiving; },

        get createError() { return createError; },
        get updateError() { return updateError; },
        get approveError() { return approveError; },
        get receiveError() { return receiveError; },

        // Utility functions
        refetch: () => queryClient.invalidateQueries({ queryKey: purchaseOrderQueryKeys.lists() }),
        refetchStats: () => queryClient.invalidateQueries({ queryKey: purchaseOrderQueryKeys.stats() })
    };
}

// Hook for fetching a single purchase order by ID
export function usePurchaseOrder(poId: string) {
	const queryClient = useQueryClient();

	const purchaseOrderQuery = createQuery<PurchaseOrder | null>({
		queryKey: purchaseOrderQueryKeys.detail(poId),
		queryFn: () => onGetPurchaseOrderById(poId),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: browser && !!poId
	});

	const purchaseOrder = $derived(purchaseOrderQuery.data);
	const isLoading = $derived(purchaseOrderQuery.isPending);
	const isError = $derived(purchaseOrderQuery.isError);
	const error = $derived(purchaseOrderQuery.error);

	return {
		purchaseOrderQuery,
		get purchaseOrder() { return purchaseOrder; },
		get isLoading() { return isLoading; },
		get isError() { return isError; },
		get error() { return error; },
		refetch: () => queryClient.invalidateQueries({ queryKey: purchaseOrderQueryKeys.detail(poId) })
	};
}

// Hook for optimistic purchase order updates
export function useOptimisticPurchaseOrderUpdate() {
	const queryClient = useQueryClient();

	return {
		// Optimistically update PO status in cache before server response
		updateStatusOptimistic: (poId: string, newStatus: PurchaseOrder['status']) => {
			// Update all relevant queries optimistically
			queryClient.setQueriesData<PaginatedPurchaseOrders>(
				{ queryKey: purchaseOrderQueryKeys.lists() },
				(oldData) => {
					if (!oldData) return oldData;
					return {
						...oldData,
						purchase_orders: oldData.purchase_orders.map((po) =>
							po.id === poId
								? { ...po, status: newStatus, updated_at: new SvelteDate().toISOString() }
								: po
						)
					};
				}
			);

			// Update detail cache if it exists
			queryClient.setQueriesData<PurchaseOrder>(
				{ queryKey: purchaseOrderQueryKeys.details() },
				(oldData) =>
					oldData?.id === poId
						? { ...oldData, status: newStatus, updated_at: new SvelteDate().toISOString() }
						: oldData
			);
		},

		// Optimistically update received quantities
		updateReceivedQuantitiesOptimistic: (
			poId: string,
			receivedItems: { product_id: string; quantity_received: number }[]
		) => {
			queryClient.setQueriesData<PaginatedPurchaseOrders>(
				{ queryKey: purchaseOrderQueryKeys.lists() },
				(oldData) => {
					if (!oldData) return oldData;
					return {
						...oldData,
						purchase_orders: oldData.purchase_orders.map((po) => {
							if (po.id !== poId) return po;

							const updatedItems = po.items.map((item) => {
								const receivedItem = receivedItems.find((ri) => ri.product_id === item.product_id);
								if (receivedItem) {
									return {
										...item,
										quantity_received:
											(item.quantity_received || 0) + receivedItem.quantity_received
									};
								}
								return item;
							});

							return { ...po, items: updatedItems, updated_at: new SvelteDate().toISOString() };
						})
					};
				}
			);
		}
	};
}
