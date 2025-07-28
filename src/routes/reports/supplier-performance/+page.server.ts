import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { get } from 'svelte/store';
import { suppliers as supplierStore } from '$lib/stores/supplierStore.svelte';
import { purchaseOrders as poStore } from '$lib/stores/purchaseOrderStore.svelte';
import type { Role } from '$lib/schemas/models';

const ALLOWED_ROLES: Role[] = ['admin', 'owner', 'manager'];

export const load: PageServerLoad = async ({ parent }) => {
    const { user } = await parent();
    if (!ALLOWED_ROLES.includes(user.role)) {
        throw redirect(302, '/reports');
    }

    const allSuppliers = supplierStore.suppliers;
    const allPOs = get(poStore);

    const performanceData = allSuppliers.map(supplier => {
        const supplierPOs = allPOs.filter(po => po.supplierName === supplier.name);
        const totalPOs = supplierPOs.length;

        if (totalPOs === 0) {
            return {
                supplierId: supplier.id,
                supplierName: supplier.name,
                onTimeRate: 0,
                avgCostVariance: 0, // Placeholder
                totalPOs: 0,
            };
        }

        const onTimePOs = supplierPOs.filter(po => {
            if (!po.expectedDate || !po.orderDate) return false;
            return new Date(po.orderDate) <= new Date(po.expectedDate);
        }).length;

        const onTimeRate = (onTimePOs / totalPOs) * 100;

        return {
            supplierId: supplier.id,
            supplierName: supplier.name,
            onTimeRate,
            avgCostVariance: 0, // Placeholder
            totalPOs,
        };
    });

    return {
        performanceData,
    };
};


