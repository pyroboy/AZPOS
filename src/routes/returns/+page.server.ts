import type { PageServerLoad } from './$types';
import type { ReturnRecord } from '$lib/schemas/models';

// In a real app, you'd fetch this from a database.
const mockReturns: ReturnRecord[] = [
    {
        id: 'RET-001',
        order_id: 'ORD-12345',
        customer_name: 'John Doe',
        reason: 'wrong_item',
        items: [
            {
                product_id: 'prod_1',
                product_name: 'Red Shirt',
                product_sku: 'SHIRT-RED-M',
                quantity: 1
            }
        ],
        status: 'pending',
        notes: 'Customer received a blue shirt instead of red.',
        created_at: new Date('2025-07-15T14:48:00Z').toISOString(),
        updated_at: new Date('2025-07-15T14:48:00Z').toISOString(),
        return_date: ''
    },
    {
        id: 'RET-002',
        order_id: 'ORD-12346',
        customer_name: 'Jane Smith',
        reason: 'defective',
        items: [
            {
                product_id: 'prod_2',
                product_name: 'White Mug',
                product_sku: 'MUG-LOGO-WHT',
                quantity: 2
            },
            {
                product_id: 'prod_3',
                product_name: 'Gel Pen',
                product_sku: 'PEN-GEL-BLK',
                quantity: 5
            }
        ],
        status: 'approved',
        notes: 'Refund processed.',
        created_at: new Date('2025-07-16T11:30:00Z').toISOString(),
        updated_at: new Date('2025-07-16T11:35:00Z').toISOString(),
        return_date: ''
    },
    {
        id: 'RET-003',
        order_id: 'ORD-12347',
        customer_name: 'Peter Jones',
        reason: 'wrong_item',
        items: [
            {
                product_id: 'prod_4',
                product_name: 'Bucket Hat',
                product_sku: 'HAT-BKT-NVY',
                quantity: 1
            }
        ],
        status: 'rejected',
        notes: 'Customer return window expired.',
        created_at: new Date('2025-07-17T09:00:00Z').toISOString(),
        updated_at: new Date('2025-07-18T10:00:00Z').toISOString(),
        return_date: ''
    }
];

export const load: PageServerLoad = async () => {
    return {
        returns: mockReturns
    };
};
