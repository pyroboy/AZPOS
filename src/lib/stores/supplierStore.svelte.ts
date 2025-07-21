import { z } from 'zod';
import { supplierSchema, purchaseOrderSchema, purchaseOrderItemSchema } from '$lib/schemas/models';
import { dev } from '$app/environment';
import {
    SvelteDate,
  } from 'svelte/reactivity';
// Infer types from schemas
type Supplier = z.infer<typeof supplierSchema>;
type PurchaseOrder = z.infer<typeof purchaseOrderSchema>;
type PurchaseOrderItem = z.infer<typeof purchaseOrderItemSchema>;




// --- SAMPLE DATA ---
const sampleSuppliers: Supplier[] = [
    {
        id: crypto.randomUUID(),
        name: 'Global Electronics Inc.',
        contact_person: 'Jane Doe',
        email: 'jane.doe@globalelectronics.com',
        phone: '123-456-7890',
        address: '123 Tech Park, Silicon Valley, CA',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: crypto.randomUUID(),
        name: 'Office Supplies Co.',
        contact_person: 'John Smith',
        email: 'john.smith@officesupplies.co',
        phone: '987-654-3210',
        address: '456 Business Rd, New York, NY',
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

const samplePurchaseOrders: PurchaseOrder[] = [
    {
        id: crypto.randomUUID(),
        supplier_id: sampleSuppliers[0].id,
        order_date: new Date('2023-10-01').toISOString(),
        expected_delivery_date: new Date('2023-10-15').toISOString(),
        status: 'received',
		items: [
			{
				id: crypto.randomUUID(), purchase_order_id: 'prod_1', quantity_ordered: 100, unit_cost: 10.50,
				product_id: ''
			},
			{
				id: crypto.randomUUID(), purchase_order_id: 'prod_2', quantity_ordered: 50, unit_cost: 25.00,
				product_id: ''
			},
		]
    },
    {
        id: crypto.randomUUID(),
        supplier_id: sampleSuppliers[0].id,
        order_date: new Date('2023-10-20').toISOString(),
        expected_delivery_date: new Date('2023-11-05').toISOString(),
        status: 'pending',
		items: [
			{
				id: crypto.randomUUID(), product_id: 'prod_3', quantity_ordered: 20, unit_cost: 150.00,
				purchase_order_id: ''
			},
		]
    }
];

// --- STORE CREATION ---
export function createSupplierStore() {
	let suppliers = $state<Supplier[]>([]);
	let purchaseOrders = $state<PurchaseOrder[]>([]);

	// Initialize with sample data in development
	if (dev) {
		suppliers = sampleSuppliers;
		purchaseOrders = samplePurchaseOrders;
	}

	function addSupplier(supplierData: Omit<Supplier, 'id' | 'created_at' | 'updated_at'>) {
		const newSupplier: Supplier = {
			...supplierData,
			id: crypto.randomUUID(),
			created_at: new SvelteDate().toISOString(),
			updated_at: new SvelteDate().toISOString(),
		};
		suppliers = [...suppliers, newSupplier];
		return newSupplier;
	}

	function updateSupplier(id: string, supplierData: Partial<Omit<Supplier, 'id' | 'created_at' | 'updated_at'>>) {
		suppliers = suppliers.map(s => 
			s.id === id ? { ...s, ...supplierData, updated_at: new SvelteDate().toISOString() } : s
		);
	}

	function toggleSupplierActive(id: string) {
		suppliers = suppliers.map(s => 
			s.id === id ? { ...s, is_active: !s.is_active, updated_at: new SvelteDate().toISOString() } : s
		);
	}

	function addPurchaseOrder(poData: Omit<PurchaseOrder, 'id'> & { items: Omit<PurchaseOrderItem, 'id'>[] }) {
		const newPO: PurchaseOrder = {
			...poData,
			id: crypto.randomUUID(),
			items: poData.items.map(item => ({ ...item, id: crypto.randomUUID() }))
		};
		purchaseOrders = [...purchaseOrders, newPO];
		return newPO;
	}

	return {
		get suppliers() { return suppliers },
		get purchaseOrders() { return purchaseOrders },
		addSupplier,
		updateSupplier,
		toggleSupplierActive,
		addPurchaseOrder
	};
}


export const suppliers = createSupplierStore();