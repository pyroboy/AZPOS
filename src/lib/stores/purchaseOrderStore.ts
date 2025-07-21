import { writable, derived, get } from 'svelte/store';
import { products } from './productStore';
import type { Product } from '$lib/schemas/models';

export type PurchaseOrderItem = {
	productId: string;
	productName: string;
	productSku: string;
	quantityOrdered: number;
	quantityReceived: number;
};

export type PurchaseOrder = {
	id: string;
	supplierName: string;
	status: 'pending' | 'in-transit' | 'arrived' | 'partial' | 'completed';
	orderDate: string;
	expectedDate: string;
	items: PurchaseOrderItem[];
};

function createInitialPOs(allProducts: Product[]): PurchaseOrder[] {
	if (allProducts.length < 9) {
		// Not enough products to create the initial POs, return empty array
		return [];
	}
	return [
		{
			id: 'PO-001',
			supplierName: 'Global Beverages Inc.',
			status: 'arrived',
			orderDate: '2025-07-10',
			expectedDate: '2025-07-17',
			items: [
				{
					productId: allProducts[0].id,
					productName: allProducts[0].name,
					productSku: allProducts[0].sku,
					quantityOrdered: 100,
					quantityReceived: 100
				},
				{
					productId: allProducts[1].id,
					productName: allProducts[1].name,
					productSku: allProducts[1].sku,
					quantityOrdered: 50,
					quantityReceived: 25 // Partial
				}
			]
		},
		{
			id: 'PO-002',
			supplierName: 'Snack Masters',
			status: 'in-transit',
			orderDate: '2025-07-12',
			expectedDate: '2025-07-19',
			items: [
				{
					productId: allProducts[4].id,
					productName: allProducts[4].name,
					productSku: allProducts[4].sku,
					quantityOrdered: 200,
					quantityReceived: 0
				}
			]
		},
		{
			id: 'PO-003',
			supplierName: 'Fresh Produce Co.',
			status: 'completed',
			orderDate: '2025-07-01',
			expectedDate: '2025-07-08',
			items: [
				{
					productId: allProducts[8].id,
					productName: allProducts[8].name,
					productSku: allProducts[8].sku,
					quantityOrdered: 30,
					quantityReceived: 30
				}
			]
		},
		{
			id: 'PO-004',
			supplierName: 'Snack Masters',
			status: 'pending',
			orderDate: '2025-07-16',
			expectedDate: '2025-07-25',
			items: [
				{
					productId: allProducts[5].id,
					productName: allProducts[5].name,
					productSku: allProducts[5].sku,
					quantityOrdered: 150,
					quantityReceived: 0
				}
			]
		}
	];
}

const _purchaseOrders = writable<PurchaseOrder[]>([], (set) => {
    // This function is called when the first subscriber subscribes.
    const allProducts = get(products);
    if (allProducts.length > 0) {
        set(createInitialPOs(allProducts));
    } else {
        // If products are not ready, subscribe to them to initialize later.
        const unsubscribe = products.subscribe(allProducts => {
            if (allProducts.length > 0) {
                set(createInitialPOs(allProducts));
                unsubscribe(); // Self-destruct after initialization
            }
        });
    }
});

function updatePO(poId: string, data: Partial<Omit<PurchaseOrder, 'items'>>) {
    _purchaseOrders.update((pos) => {
        const index = pos.findIndex((p) => p.id === poId);
        if (index !== -1) {
            pos[index] = { ...pos[index], ...data };
        }
        return pos;
    });
}

function updateReceivedQuantity(poId: string, itemId: string, received: number) {
    _purchaseOrders.update((pos) => {
        const po = pos.find((p) => p.id === poId);
        if (po) {
            const item = po.items.find((i) => i.productId === itemId);
            if (item) {
                item.quantityReceived = received;
            }
        }
        return pos;
    });
}

export const purchaseOrders = derived(_purchaseOrders, $orders => $orders);

export const poActions = {
    updatePO,
    updateReceivedQuantity
};
