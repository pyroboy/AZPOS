import { writable } from 'svelte/store';
import type { InventoryAdjustment } from '$lib/schemas/models';

// Sample inventory adjustment data for MVP
const initialAdjustments: InventoryAdjustment[] = [
    {
        id: 'adj-sale-1',
        product_id: 'prod-paracetamol-500',
        batch_id: 'batch-para-1',
        quantity_adjusted: -2,
        adjustment_type: 'subtract',
        reason: 'Sale (Order: ord-12345)',
        created_at: new Date('2023-10-15T10:00:00Z').toISOString(),
        user_id: 'user-cashier'
    },
    {
        id: 'adj-stockin-1',
        product_id: 'prod-paracetamol-500',
        batch_id: 'batch-para-1',
        quantity_adjusted: 100,
        adjustment_type: 'add',
        reason: 'Stock In (PO Item: po-item-1)',
        created_at: new Date('2023-10-01T09:00:00Z').toISOString(),
        user_id: 'user-manager'
    },
];

function createInventoryAdjustmentStore() {
    const { subscribe, set, update } = writable<InventoryAdjustment[]>(initialAdjustments);

    return {
        subscribe,
        addAdjustment: (adjustment: Omit<InventoryAdjustment, 'id' | 'created_at'>) => {
            const newAdjustment: InventoryAdjustment = {
                id: `adj-${crypto.randomUUID()}`,
                created_at: new Date().toISOString(),
                ...adjustment
            };
            update(adjustments => [...adjustments, newAdjustment]);
        },
        reset: () => set(initialAdjustments),
    };
}

export const inventoryAdjustments = createInventoryAdjustmentStore();
