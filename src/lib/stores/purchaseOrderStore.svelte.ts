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

// Initial sample data
const initialPOs: PurchaseOrder[] = [
	{
		id: 'PO-001',
		supplierName: 'Global Beverages Inc.',
		status: 'arrived',
		orderDate: '2025-07-10',
		expectedDate: '2025-07-17',
		items: [
			{
				productId: 'prod1',
				productName: 'Sample Product 1',
				productSku: 'SKU001',
				quantityOrdered: 100,
				quantityReceived: 100
			},
			{
				productId: 'prod2',
				productName: 'Sample Product 2',
				productSku: 'SKU002',
				quantityOrdered: 50,
				quantityReceived: 25 // Partial
			}
		]
	},
	{
		id: 'PO-002',
		supplierName: 'Fresh Foods Co.',
		status: 'in-transit',
		orderDate: '2025-07-12',
		expectedDate: '2025-07-19',
		items: [
			{
				productId: 'prod3',
				productName: 'Sample Product 3',
				productSku: 'SKU003',
				quantityOrdered: 75,
				quantityReceived: 0
			}
		]
	}
];

function createPurchaseOrderStore() {
	// Use $state for purchase orders
	const purchaseOrders = $state<PurchaseOrder[]>([...initialPOs]);

	// Derived states for different PO statuses
	const pendingOrders = $derived(purchaseOrders.filter((po) => po.status === 'pending'));
	const inTransitOrders = $derived(purchaseOrders.filter((po) => po.status === 'in-transit'));
	const arrivedOrders = $derived(purchaseOrders.filter((po) => po.status === 'arrived'));
	const partialOrders = $derived(purchaseOrders.filter((po) => po.status === 'partial'));
	const completedOrders = $derived(purchaseOrders.filter((po) => po.status === 'completed'));

	function updatePO(poId: string, data: Partial<Omit<PurchaseOrder, 'items'>>) {
		const index = purchaseOrders.findIndex((po) => po.id === poId);
		if (index !== -1) {
			purchaseOrders[index] = { ...purchaseOrders[index], ...data };
		}
	}

	function updateReceivedQuantity(poId: string, itemId: string, received: number) {
		const poIndex = purchaseOrders.findIndex((po) => po.id === poId);
		if (poIndex !== -1) {
			const itemIndex = purchaseOrders[poIndex].items.findIndex(
				(item) => item.productId === itemId
			);
			if (itemIndex !== -1) {
				purchaseOrders[poIndex].items[itemIndex] = {
					...purchaseOrders[poIndex].items[itemIndex],
					quantityReceived: received
				};
			}
		}
	}

	function addPurchaseOrder(po: Omit<PurchaseOrder, 'id'>) {
		const newPO: PurchaseOrder = {
			...po,
			id: `PO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
		};
		purchaseOrders.push(newPO);
		return newPO;
	}

	function deletePurchaseOrder(poId: string) {
		const index = purchaseOrders.findIndex((po) => po.id === poId);
		if (index !== -1) {
			purchaseOrders.splice(index, 1);
		}
	}

	function setPurchaseOrders(newPOs: PurchaseOrder[]) {
		purchaseOrders.length = 0; // Clear existing POs
		purchaseOrders.push(...newPOs);
	}

	function reset() {
		purchaseOrders.length = 0;
		purchaseOrders.push(...initialPOs);
	}

	// Return the public API
	return {
		// Expose state via getters
		get purchaseOrders() {
			return purchaseOrders;
		},
		get pendingOrders() {
			return pendingOrders;
		},
		get inTransitOrders() {
			return inTransitOrders;
		},
		get arrivedOrders() {
			return arrivedOrders;
		},
		get partialOrders() {
			return partialOrders;
		},
		get completedOrders() {
			return completedOrders;
		},

		// Expose methods
		updatePO,
		updateReceivedQuantity,
		addPurchaseOrder,
		deletePurchaseOrder,
		setPurchaseOrders,
		reset
	};
}

export const purchaseOrderStore = createPurchaseOrderStore();
