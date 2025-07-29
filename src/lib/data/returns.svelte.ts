import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import { SvelteDate } from 'svelte/reactivity';
import type {
	EnhancedReturnRecord,
	NewReturnInput,
	UpdateReturnStatusInput,
	ReturnFilters,
	ReturnStats
} from '$lib/types/returns.schema';

// Dynamic import wrappers for Telefunc functions (avoids SSR import issues)
const onGetReturns = async (filters?: ReturnFilters): Promise<EnhancedReturnRecord[]> => {
	const { onGetReturns } = await import('$lib/server/telefuncs/returns.telefunc');
	return onGetReturns(filters);
};

const onCreateReturn = async (newReturn: NewReturnInput): Promise<EnhancedReturnRecord> => {
	const { onCreateReturn } = await import('$lib/server/telefuncs/returns.telefunc');
	return onCreateReturn(newReturn);
};

const onUpdateReturnStatus = async (updateData: UpdateReturnStatusInput): Promise<EnhancedReturnRecord> => {
	const { onUpdateReturnStatus } = await import('$lib/server/telefuncs/returns.telefunc');
	return onUpdateReturnStatus(updateData);
};

const onGetReturnById = async (returnId: string): Promise<EnhancedReturnRecord | null> => {
	const { onGetReturnById } = await import('$lib/server/telefuncs/returns.telefunc');
	return onGetReturnById(returnId);
};

const onGetReturnStats = async (): Promise<ReturnStats> => {
	const { onGetReturnStats } = await import('$lib/server/telefuncs/returns.telefunc');
	return onGetReturnStats();
};

const onDeleteReturn = async (returnId: string): Promise<void> => {
	const { onDeleteReturn } = await import('$lib/server/telefuncs/returns.telefunc');
	return onDeleteReturn(returnId);
};

// Query keys for consistent cache management
const returnsQueryKeys = {
	all: ['returns'] as const,
	lists: () => [...returnsQueryKeys.all, 'list'] as const,
	list: (filters?: ReturnFilters) => [...returnsQueryKeys.lists(), filters] as const,
	details: () => [...returnsQueryKeys.all, 'detail'] as const,
	detail: (id: string) => [...returnsQueryKeys.details(), id] as const,
	stats: () => [...returnsQueryKeys.all, 'stats'] as const
};

export function useReturns(filters?: ReturnFilters) {
	const queryClient = useQueryClient();

	// Query to fetch returns list with optional filters
	const returnsQuery = createQuery<EnhancedReturnRecord[]>({
		queryKey: returnsQueryKeys.list(filters),
		queryFn: () => onGetReturns(filters),
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
		enabled: browser
	});

	// Query to fetch return statistics
	const statsQuery = createQuery<ReturnStats>({
		queryKey: returnsQueryKeys.stats(),
		queryFn: onGetReturnStats,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: browser
	});

	// Mutation to create a new return
	const createReturnMutation = createMutation({
		mutationFn: (newReturn: NewReturnInput) => onCreateReturn(newReturn),
		onSuccess: (newReturn) => {
			// Invalidate and refetch returns list
			queryClient.invalidateQueries({ queryKey: returnsQueryKeys.lists() });
			queryClient.invalidateQueries({ queryKey: returnsQueryKeys.stats() });

			// Optimistically add the new return to cache
			queryClient.setQueryData<EnhancedReturnRecord[]>(returnsQueryKeys.list(filters), (oldData) =>
				oldData ? [newReturn, ...oldData] : [newReturn]
			);
		},
		onError: (error) => {
			console.error('Failed to create return:', error);
		}
	});

	// Mutation to update return status
	const updateStatusMutation = createMutation({
		mutationFn: (updateData: UpdateReturnStatusInput) => onUpdateReturnStatus(updateData),
		onSuccess: (updatedReturn) => {
			// Update the specific return in all relevant queries
			queryClient.setQueryData<EnhancedReturnRecord[]>(
				returnsQueryKeys.list(filters),
				(oldData) =>
					oldData?.map((returnRecord) =>
						returnRecord.id === updatedReturn.id ? updatedReturn : returnRecord
					) || []
			);

			// Update detail cache if it exists
			queryClient.setQueryData(returnsQueryKeys.detail(updatedReturn.id), updatedReturn);

			// Invalidate stats to get fresh counts
			queryClient.invalidateQueries({ queryKey: returnsQueryKeys.stats() });
		},
		onError: (error) => {
			console.error('Failed to update return status:', error);
		}
	});

	// Mutation to delete a return
	const deleteReturnMutation = createMutation({
		mutationFn: (returnId: string) => onDeleteReturn(returnId),
		onSuccess: (_, returnId) => {
			// Remove from all lists
			queryClient.setQueryData<EnhancedReturnRecord[]>(
				returnsQueryKeys.list(filters),
				(oldData) => oldData?.filter((returnRecord) => returnRecord.id !== returnId) || []
			);

			// Remove detail cache
			queryClient.removeQueries({ queryKey: returnsQueryKeys.detail(returnId) });

			// Invalidate stats
			queryClient.invalidateQueries({ queryKey: returnsQueryKeys.stats() });
		},
		onError: (error) => {
			console.error('Failed to delete return:', error);
		}
	});

	// Derived reactive state using Svelte 5 runes
	const returns = $derived(returnsQuery.data ?? []);
	const stats = $derived(statsQuery.data);

	// Derived filtered states
	const pendingReturns = $derived(
		returns.filter((r: EnhancedReturnRecord) => r.status === 'pending')
	);
	const approvedReturns = $derived(
		returns.filter((r: EnhancedReturnRecord) => r.status === 'approved')
	);
	const rejectedReturns = $derived(
		returns.filter((r: EnhancedReturnRecord) => r.status === 'rejected')
	);
	const completedReturns = $derived(
		returns.filter((r: EnhancedReturnRecord) => r.status === 'completed')
	);
	const processingReturns = $derived(
		returns.filter((r: EnhancedReturnRecord) => r.status === 'processing')
	);

	// Loading and error states
	const isLoading = $derived(returnsQuery.isPending);
	const isError = $derived(returnsQuery.isError);
	const error = $derived(returnsQuery.error);

	const isStatsLoading = $derived(statsQuery.isPending);
	const isStatsError = $derived(statsQuery.isError);

	// Mutation states
	const isCreating = $derived(createReturnMutation.isPending);
	const isUpdating = $derived(updateStatusMutation.isPending);
	const isDeleting = $derived(deleteReturnMutation.isPending);

	const createError = $derived(createReturnMutation.error);
	const updateError = $derived(updateStatusMutation.error);
	const deleteError = $derived(deleteReturnMutation.error);

	return {
		// Queries
		returnsQuery,
		statsQuery,

		// Reactive data
		get returns() { return returns; },
		get stats() { return stats; },

		// Filtered data
		get pendingReturns() { return pendingReturns; },
		get approvedReturns() { return approvedReturns; },
		get rejectedReturns() { return rejectedReturns; },
		get completedReturns() { return completedReturns; },
		get processingReturns() { return processingReturns; },

		// Loading states
		get isLoading() { return isLoading; },
		get isError() { return isError; },
		get error() { return error; },
		get isStatsLoading() { return isStatsLoading; },
		get isStatsError() { return isStatsError; },

		// Mutations
		createReturn: createReturnMutation.mutate,
		updateStatus: updateStatusMutation.mutate,
		deleteReturn: deleteReturnMutation.mutate,

		// Mutation states
		get isCreating() { return isCreating; },
		get isUpdating() { return isUpdating; },
		get isDeleting() { return isDeleting; },

		get createError() { return createError; },
		get updateError() { return updateError; },
		get deleteError() { return deleteError; },

		// Utility functions
		refetch: () => queryClient.invalidateQueries({ queryKey: returnsQueryKeys.lists() }),
		refetchStats: () => queryClient.invalidateQueries({ queryKey: returnsQueryKeys.stats() })
	};
}

// Hook for fetching a single return by ID
export function useReturn(returnId: string) {
	const queryClient = useQueryClient();

	const returnQuery = createQuery<EnhancedReturnRecord | null>({
		queryKey: returnsQueryKeys.detail(returnId),
		queryFn: () => onGetReturnById(returnId),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: browser && !!returnId
	});

	const returnData = $derived(returnQuery.data);
	const isLoading = $derived(returnQuery.isPending);
	const isError = $derived(returnQuery.isError);
	const error = $derived(returnQuery.error);

	return {
		returnQuery,
		get returnData() { return returnData; },
		get isLoading() { return isLoading; },
		get isError() { return isError; },
		get error() { return error; },
		refetch: () => queryClient.invalidateQueries({ queryKey: returnsQueryKeys.detail(returnId) })
	};
}

// Hook for optimistic return status updates
export function useOptimisticReturnUpdate() {
	const queryClient = useQueryClient();

	return {
		// Optimistically update return status in cache before server response
		updateReturnOptimistic: (
			returnId: string,
			newStatus: EnhancedReturnRecord['status'],
			adminNotes?: string
		) => {
			// Update all relevant queries optimistically
			queryClient.setQueriesData<EnhancedReturnRecord[]>(
				{ queryKey: returnsQueryKeys.lists() },
				(oldData) =>
					oldData?.map((returnRecord) =>
						returnRecord.id === returnId
							? {
									...returnRecord,
									status: newStatus,
									admin_notes: adminNotes || returnRecord.admin_notes,
									updated_at: new SvelteDate().toISOString()
								}
							: returnRecord
					) || []
			);

			// Update detail cache if it exists
			queryClient.setQueriesData<EnhancedReturnRecord>(
				{ queryKey: returnsQueryKeys.details() },
				(oldData) =>
					oldData?.id === returnId
						? {
								...oldData,
								status: newStatus,
								admin_notes: adminNotes || oldData.admin_notes,
								updated_at: new SvelteDate().toISOString()
							}
						: oldData
			);
		}
	};
}
