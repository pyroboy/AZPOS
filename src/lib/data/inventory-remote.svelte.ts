import { browser } from '$app/environment';
import type {
	InventoryItem,
	InventoryMovement,
	InventoryFilters,
	InventoryValuation,
	InventoryAlert,
	CreateInventoryMovement,
	CreateStockCount
} from '$lib/types/inventory.schema';
import {
	getInventoryItems,
	getInventoryMovements,
	getInventoryValuation,
	getInventoryAlerts,
	createInventoryMovement,
	createStockCount
} from '$lib/remote/inventory.remote';

export function useInventory(filters?: InventoryFilters) {
	// Create reactive state for inventory query
	let inventoryData = $state<InventoryItem[]>([]);
	let isLoading = $state(false);
	let isError = $state(false);
	let error = $state<Error | null>(null);

	// Create reactive state for valuation query
	let valuationData = $state<InventoryValuation | undefined>(undefined);
	let isValuationLoading = $state(false);

	// Create reactive state for alerts query
	let alertsData = $state<InventoryAlert[]>([]);
	let isAlertsLoading = $state(false);

	// Function to fetch inventory items
	async function fetchInventoryItems() {
		if (!browser) return;
		
		try {
			isLoading = true;
			isError = false;
			error = null;
			
			console.log('🔄 [REMOTE HOOK] Starting inventory items query with filters:', filters);
			const result = await getInventoryItems(filters);
			inventoryData = result;
			console.log('✅ [REMOTE HOOK] Inventory items query successful, count:', result.length);
		} catch (err) {
			console.error('❌ [REMOTE HOOK] Inventory items query failed:', err);
			isError = true;
			error = err as Error;
		} finally {
			isLoading = false;
		}
	}

	// Function to fetch valuation
	async function fetchValuation() {
		if (!browser) return;
		
		try {
			isValuationLoading = true;
			const result = await getInventoryValuation();
			valuationData = result;
		} catch (err) {
			console.error('❌ [REMOTE HOOK] Valuation query failed:', err);
		} finally {
			isValuationLoading = false;
		}
	}

	// Function to fetch alerts
	async function fetchAlerts() {
		if (!browser) return;
		
		try {
			isAlertsLoading = true;
			const result = await getInventoryAlerts();
			alertsData = result;
		} catch (err) {
			console.error('❌ [REMOTE HOOK] Alerts query failed:', err);
		} finally {
			isAlertsLoading = false;
		}
	}

	// Auto-fetch on mount and when filters change
	$effect(() => {
		fetchInventoryItems();
		fetchValuation();
		fetchAlerts();
	});

	// Derived filtered states
	const lowStockItems = $derived(() => {
		return inventoryData.filter((item: InventoryItem) => {
			// Assuming we have product info with min_stock_level
			return item.quantity_available > 0 && item.quantity_available < 10; // Placeholder logic
		});
	});

	const outOfStockItems = $derived(() => {
		return inventoryData.filter((item: InventoryItem) => item.quantity_available === 0);
	});

	const expiredItems = $derived(() => {
		return inventoryData.filter((item: InventoryItem) => {
			if (!item.expiry_date) return false;
			return new Date(item.expiry_date) < new Date();
		});
	});

	const expiringSoonItems = $derived(() => {
		return inventoryData.filter((item: InventoryItem) => {
			if (!item.expiry_date) return false;
			const expiryDate = new Date(item.expiry_date);
			const thirtyDaysFromNow = new Date();
			thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
			return expiryDate < thirtyDaysFromNow && expiryDate >= new Date();
		});
	});

	// Mutation functions
	async function createMovementMutation(movementData: CreateInventoryMovement) {
		try {
			const newMovement = await createInventoryMovement(movementData);
			// Refresh inventory data after successful movement
			await fetchInventoryItems();
			await fetchValuation();
			await fetchAlerts();
			return newMovement;
		} catch (err) {
			console.error('Failed to create inventory movement:', err);
			throw err;
		}
	}

	async function createStockCountMutation(countData: CreateStockCount) {
		try {
			const newStockCount = await createStockCount(countData);
			// Refresh all inventory-related data after successful count
			await fetchInventoryItems();
			await fetchValuation();
			await fetchAlerts();
			return newStockCount;
		} catch (err) {
			console.error('Failed to create stock count:', err);
			throw err;
		}
	}

	return {
		// Reactive data getters
		inventoryItems: () => {
			console.log('📊 [DATA ACCESS] Getting inventory items, count:', inventoryData.length);
			return inventoryData;
		},
		valuation: () => valuationData,
		alerts: () => alertsData,

		// Filtered data getters
		lowStockItems,
		outOfStockItems,
		expiredItems,
		expiringSoonItems,

		// Loading state getters
		isLoading: () => isLoading,
		isError: () => isError,
		error: () => error,
		isValuationLoading: () => isValuationLoading,
		isAlertsLoading: () => isAlertsLoading,

		// Mutations
		createMovement: createMovementMutation,
		createStockCount: createStockCountMutation,

		// Mutation state getters (placeholder - remote functions handle this internally)
		isCreatingMovement: () => false,
		isCreatingStockCount: () => false,
		createMovementError: () => null,
		createStockCountError: () => null,

		// Utility functions
		refetch: fetchInventoryItems,
		refetchValuation: fetchValuation,
		refetchAlerts: fetchAlerts
	};
}

// Hook for fetching inventory movements/history
export function useInventoryMovements(productId?: string, locationId?: string) {
	// Create reactive state for movements query
	let movementsData = $state<InventoryMovement[]>([]);
	let isLoading = $state(false);
	let isError = $state(false);
	let error = $state<Error | null>(null);

	// Function to fetch movements
	async function fetchMovements() {
		if (!browser || (!productId && !locationId)) return;
		
		try {
			isLoading = true;
			isError = false;
			error = null;
			
			const result = await getInventoryMovements(productId, locationId);
			movementsData = result;
		} catch (err) {
			console.error('❌ [REMOTE HOOK] Movements query failed:', err);
			isError = true;
			error = err as Error;
		} finally {
			isLoading = false;
		}
	}

	// Auto-fetch on mount and when filters change
	$effect(() => {
		fetchMovements();
	});

	return {
		movements: () => movementsData,
		isLoading: () => isLoading,
		isError: () => isError,
		error: () => error,
		refetch: fetchMovements
	};
}

// Hook for optimistic inventory updates
export function useOptimisticInventoryUpdate() {
	return {
		// Note: With remote functions, optimistic updates are handled differently
		// These functions could be enhanced to work with the reactive state above
		updateQuantityOptimistic: (
			productId: string,
			locationId: string | undefined,
			newQuantity: number
		) => {
			console.log('Optimistic update would be applied here:', { productId, locationId, newQuantity });
			// In a full implementation, this would update the local reactive state
		},

		addMovementOptimistic: (movement: Omit<InventoryMovement, 'id' | 'created_at'>) => {
			console.log('Optimistic movement would be added here:', movement);
			// In a full implementation, this would add to the local reactive state
		}
	};
}