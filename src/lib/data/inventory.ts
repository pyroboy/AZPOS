import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import type {
	InventoryItem,
	InventoryMovement,
	CreateInventoryMovement,
	InventoryFilters,
	InventoryValuation,
	CreateStockCount,
	InventoryAlert
} from '$lib/types/inventory.schema';

// Dynamic import wrappers for Telefunc functions (avoids SSR import issues)
const onGetInventoryItems = async (filters?: InventoryFilters): Promise<InventoryItem[]> => {
	const { onGetInventoryItems } = await import('$lib/server/telefuncs/inventory.telefunc');
	return onGetInventoryItems(filters);
};

const onCreateInventoryMovement = async (movementData: CreateInventoryMovement): Promise<InventoryMovement> => {
	const { onCreateInventoryMovement } = await import('$lib/server/telefuncs/inventory.telefunc');
	return onCreateInventoryMovement(movementData);
};

const onGetInventoryMovements = async (productId?: string, locationId?: string): Promise<InventoryMovement[]> => {
	const { onGetInventoryMovements } = await import('$lib/server/telefuncs/inventory.telefunc');
	return onGetInventoryMovements(productId, locationId);
};

const onGetInventoryValuation = async (): Promise<InventoryValuation> => {
	const { onGetInventoryValuation } = await import('$lib/server/telefuncs/inventory.telefunc');
	return onGetInventoryValuation();
};

const onCreateStockCount = async (countData: CreateStockCount): Promise<any> => {
	const { onCreateStockCount } = await import('$lib/server/telefuncs/inventory.telefunc');
	return onCreateStockCount(countData);
};

const onGetInventoryAlerts = async (): Promise<InventoryAlert[]> => {
	const { onGetInventoryAlerts } = await import('$lib/server/telefuncs/inventory.telefunc');
	return onGetInventoryAlerts();
};

// Query keys for consistent cache management
const inventoryQueryKeys = {
	all: ['inventory'] as const,
	items: () => [...inventoryQueryKeys.all, 'items'] as const,
	itemsList: (filters?: InventoryFilters) => [...inventoryQueryKeys.items(), filters] as const,
	movements: () => [...inventoryQueryKeys.all, 'movements'] as const,
	movementsList: (productId?: string, locationId?: string) =>
		[...inventoryQueryKeys.movements(), productId, locationId] as const,
	valuation: () => [...inventoryQueryKeys.all, 'valuation'] as const,
	alerts: () => [...inventoryQueryKeys.all, 'alerts'] as const,
	counts: () => [...inventoryQueryKeys.all, 'counts'] as const
};

export function useInventory(filters?: InventoryFilters) {
	const queryClient = useQueryClient();

	// Query to fetch inventory items with filters
	const inventoryQuery = createQuery<InventoryItem[]>({
		queryKey: inventoryQueryKeys.itemsList(filters),
		queryFn: () => onGetInventoryItems(filters),
		staleTime: 1000 * 60 * 2, // 2 minutes
		gcTime: 1000 * 60 * 10, // 10 minutes
		enabled: browser // Only run on client-side
	});

	// Query to fetch inventory valuation
	const valuationQuery = createQuery<InventoryValuation>({
		queryKey: inventoryQueryKeys.valuation(),
		queryFn: onGetInventoryValuation,
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: browser // Only run on client-side
	});

	// Query to fetch inventory alerts
	const alertsQuery = createQuery<InventoryAlert[]>({
		queryKey: inventoryQueryKeys.alerts(),
		queryFn: onGetInventoryAlerts,
		staleTime: 1000 * 60 * 1, // 1 minute - alerts should be fresh
		gcTime: 1000 * 60 * 5, // 5 minutes
		enabled: browser // Only run on client-side
	});

	// Mutation to create inventory movement
	const createMovementMutation = createMutation({
		mutationFn: (movementData: CreateInventoryMovement) => onCreateInventoryMovement(movementData),
		onSuccess: (newMovement) => {
			// Invalidate and refetch inventory items
			queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items() });
			queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.valuation() });
			queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.alerts() });

			// Invalidate movements for this product
			queryClient.invalidateQueries({
				queryKey: inventoryQueryKeys.movementsList(newMovement.product_id, newMovement.location_id)
			});
		},
		onError: (error) => {
			console.error('Failed to create inventory movement:', error);
		}
	});

	// Mutation to create stock count
	const createStockCountMutation = createMutation({
		mutationFn: (countData: CreateStockCount) => onCreateStockCount(countData),
		onSuccess: () => {
			// Invalidate all inventory-related queries
			queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items() });
			queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.valuation() });
			queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.alerts() });
			queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.movements() });
			queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.counts() });
		},
		onError: (error) => {
			console.error('Failed to create stock count:', error);
		}
	});

	// Derived reactive state using Svelte 5 runes
	const inventoryItems = $derived(inventoryQuery.data ?? []);
	const valuation = $derived(valuationQuery.data);
	const alerts = $derived(alertsQuery.data ?? []);

	// Derived filtered states
	const lowStockItems = $derived(
		inventoryItems.filter((item: InventoryItem) => {
			// Assuming we have product info with min_stock_level
			return item.quantity_available > 0 && item.quantity_available < 10; // Placeholder logic
		})
	);

	const outOfStockItems = $derived(
		inventoryItems.filter((item: InventoryItem) => item.quantity_available === 0)
	);

	const expiredItems = $derived(
		inventoryItems.filter((item: InventoryItem) => {
			if (!item.expiry_date) return false;
			return new Date(item.expiry_date) < new Date();
		})
	);

	const expiringSoonItems = $derived(
		inventoryItems.filter((item: InventoryItem) => {
			if (!item.expiry_date) return false;
			const expiryDate = new Date(item.expiry_date);
			const thirtyDaysFromNow = new Date();
			thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
			return expiryDate < thirtyDaysFromNow && expiryDate >= new Date();
		})
	);

	// Loading and error states
	const isLoading = $derived(inventoryQuery.isPending);
	const isError = $derived(inventoryQuery.isError);
	const error = $derived(inventoryQuery.error);

	const isValuationLoading = $derived(valuationQuery.isPending);
	const isAlertsLoading = $derived(alertsQuery.isPending);

	return {
		// Queries
		inventoryQuery,
		valuationQuery,
		alertsQuery,

		// Reactive data
		inventoryItems,
		valuation,
		alerts,

		// Filtered data
		lowStockItems,
		outOfStockItems,
		expiredItems,
		expiringSoonItems,

		// Loading states
		isLoading,
		isError,
		error,
		isValuationLoading,
		isAlertsLoading,

		// Mutations
		createMovement: createMovementMutation.mutate,
		createStockCount: createStockCountMutation.mutate,

		// Mutation states
		isCreatingMovement: $derived(createMovementMutation.isPending),
		isCreatingStockCount: $derived(createStockCountMutation.isPending),

		createMovementError: $derived(createMovementMutation.error),
		createStockCountError: $derived(createStockCountMutation.error),

		// Utility functions
		refetch: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.items() }),
		refetchValuation: () =>
			queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.valuation() }),
		refetchAlerts: () => queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.alerts() })
	};
}

// Hook for fetching inventory movements/history
export function useInventoryMovements(productId?: string, locationId?: string) {
	const queryClient = useQueryClient();

	const movementsQuery = createQuery<InventoryMovement[]>({
		queryKey: inventoryQueryKeys.movementsList(productId, locationId),
		queryFn: () => onGetInventoryMovements(productId, locationId),
		staleTime: 1000 * 60 * 5, // 5 minutes
		gcTime: 1000 * 60 * 15, // 15 minutes
		enabled: browser && !!(productId || locationId) // Only run on client-side and if we have filters
	});

	const movements = $derived(movementsQuery.data ?? []);
	const isLoading = $derived(movementsQuery.isPending);
	const isError = $derived(movementsQuery.isError);
	const error = $derived(movementsQuery.error);

	return {
		movementsQuery,
		movements,
		isLoading,
		isError,
		error,
		refetch: () =>
			queryClient.invalidateQueries({
				queryKey: inventoryQueryKeys.movementsList(productId, locationId)
			})
	};
}

// Hook for optimistic inventory updates
export function useOptimisticInventoryUpdate() {
	const queryClient = useQueryClient();

	return {
		// Optimistically update inventory quantity in cache before server response
		updateQuantityOptimistic: (
			productId: string,
			locationId: string | undefined,
			newQuantity: number
		) => {
			// Update inventory items cache
			queryClient.setQueriesData<InventoryItem[]>(
				{ queryKey: inventoryQueryKeys.items() },
				(oldData) =>
					oldData?.map((item) =>
						item.product_id === productId && item.location_id === locationId
							? {
									...item,
									quantity_available: newQuantity,
									quantity_on_hand: newQuantity,
									last_movement_at: new Date().toISOString(),
									updated_at: new Date().toISOString()
								}
							: item
					) || []
			);
		},

		// Optimistically add movement to history
		addMovementOptimistic: (movement: Omit<InventoryMovement, 'id' | 'created_at'>) => {
			const optimisticMovement: InventoryMovement = {
				...movement,
				id: `temp-${Date.now()}`,
				created_at: new Date().toISOString()
			};

			queryClient.setQueriesData<InventoryMovement[]>(
				{ queryKey: inventoryQueryKeys.movementsList(movement.product_id, movement.location_id) },
				(oldData) => (oldData ? [optimisticMovement, ...oldData] : [optimisticMovement])
			);
		}
	};
}
