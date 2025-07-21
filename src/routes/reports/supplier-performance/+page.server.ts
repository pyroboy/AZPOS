import { suppliers } from '$lib/stores/supplierStore.svelte';



export const load = () => {
    const performanceData = suppliers.suppliers.map(supplier => {
        const supplierPOs = suppliers.purchaseOrders.filter(po => po.supplier_id === supplier.id);
        const totalPOs = supplierPOs.length;

        if (totalPOs === 0) {
            return {
                supplierId: supplier.id,
                supplierName: supplier.name,
                onTimeRate: 0,
                avgCostVariance: 0,
                totalPOs: 0,
            };
        }

        const onTimePOs = supplierPOs.filter(po => 
            po.expected_delivery_date && new Date(po.expected_delivery_date) <= new Date()
        ).length;

        const onTimeRate = (onTimePOs / totalPOs) * 100;

        // Cost variance calculation (simplified)
        // This assumes a 'cost' on the PO item vs a standard cost on the product.
        // This part will need significant refinement based on the actual data model.
        const avgCostVariance = 0; // Placeholder

        return {
            supplierId: supplier.id,
            supplierName: supplier.name,
            onTimeRate,
            avgCostVariance,
            totalPOs,
        };
    });

    return {
        performanceData,
    };
};


