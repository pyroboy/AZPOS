import { query, command, getRequestEvent } from '$app/server';
import { createSupabaseClient } from '$lib/server/db';
import { 
    purchaseOrderFiltersSchema,
    createPurchaseOrderSchema,
    updatePurchaseOrderSchema,
    receiveItemsSchema,
    approvePurchaseOrderSchema,
    type PurchaseOrder,
    type PurchaseOrderFilters,
    type CreatePurchaseOrder,
    type UpdatePurchaseOrder,
    type ReceiveItems,
    type ApprovePurchaseOrder,
    type PurchaseOrderStats,
    type PaginatedPurchaseOrders
} from '$lib/types/purchaseOrder.schema';
import { z } from 'zod';

console.log('🔄 [purchaseOrders.remote] Loading purchase orders remote functions');
console.log('📦 [purchaseOrders.remote] Module loaded successfully');

// Helper to get authenticated user context (optional for read operations)
function getAuthenticatedUser(required = true) {
	const event = getRequestEvent();
	const user = event.locals.user;
	if (required && !user) {
		throw new Error('Authentication required');
	}
	return user;
}

// ========================
// QUERY FUNCTIONS
// ========================

export const getPurchaseOrders = query(
    purchaseOrderFiltersSchema.optional(),
    async (filters?: PurchaseOrderFilters): Promise<{
        purchaseOrders: PurchaseOrder[];
        total: number;
        stats: PurchaseOrderStats;
    }> => {
    console.log('🔍 [getPurchaseOrders] Fetching purchase orders with filters', { filters, timestamp: new Date().toISOString() });
    
    const user = getAuthenticatedUser(false);
    const supabase = createSupabaseClient();
    
    let queryBuilder = supabase
        .from('purchase_orders')
        .select(`
            id,
            po_number,
            supplier_id,
            status,
            order_date,
            expected_delivery_date,
            total_amount,
            tax_amount,
            shipping_cost,
            notes,
            created_by,
            created_at,
            updated_at,
            purchase_order_items (
                id,
                product_id,
                quantity_ordered,
                quantity_received,
                unit_cost,
                total_cost,
                notes,
                products (
                    name,
                    sku
                )
            )
        `)
        .order('created_at', { ascending: false });

    // Apply filters if provided
    if (filters) {
        const validatedFilters = purchaseOrderFiltersSchema.parse(filters);
        
        if (validatedFilters.supplier_id) {
            queryBuilder = queryBuilder.eq('supplier_id', validatedFilters.supplier_id);
        }
        
        if (validatedFilters.status && validatedFilters.status !== 'all') {
            queryBuilder = queryBuilder.eq('status', validatedFilters.status);
        }
        
        if (validatedFilters.date_from) {
            queryBuilder = queryBuilder.gte('order_date', validatedFilters.date_from);
        }
        
        if (validatedFilters.date_to) {
            queryBuilder = queryBuilder.lte('order_date', validatedFilters.date_to);
        }
        
        if (validatedFilters.created_by) {
            queryBuilder = queryBuilder.eq('created_by', validatedFilters.created_by);
        }
        
        if (validatedFilters.search) {
            queryBuilder = queryBuilder.or(
                `po_number.ilike.%${validatedFilters.search}%,supplier_id.ilike.%${validatedFilters.search}%`
            );
        }
        
        if (validatedFilters.sort_by && validatedFilters.sort_order) {
            queryBuilder = queryBuilder.order(validatedFilters.sort_by, { 
                ascending: validatedFilters.sort_order === 'asc' 
            });
        }
        
        if (validatedFilters.limit) {
            queryBuilder = queryBuilder.limit(validatedFilters.limit);
        }
        
        if (validatedFilters.page && validatedFilters.limit) {
            const offset = (validatedFilters.page - 1) * validatedFilters.limit;
            queryBuilder = queryBuilder.range(offset, offset + validatedFilters.limit - 1);
        }
    }

    const { data: purchaseOrders, error: purchaseOrdersError } = await queryBuilder;
    
    if (purchaseOrdersError) {
        console.error('❌ [getPurchaseOrders] Supabase error:', purchaseOrdersError);
        throw new Error(`Failed to fetch purchase orders: ${purchaseOrdersError.message}`);
    }

    // Get stats separately
    const { data: statsData, error: statsError } = await supabase
        .from('purchase_orders')
        .select('status, total_amount, supplier_id')
        .order('created_at', { ascending: false });

    if (statsError) {
        console.error('❌ [getPurchaseOrders] Stats error:', statsError);
        throw new Error(`Failed to fetch purchase order stats: ${statsError.message}`);
    }

    // Calculate stats
    const uniqueSuppliers = new Set(statsData?.map(po => po.supplier_id) || []);
    const totalValue = statsData?.reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0;
    const totalOrders = statsData?.length || 0;
    
    const stats: PurchaseOrderStats = {
        total_orders: totalOrders,
        draft_count: statsData?.filter(po => po.status === 'draft').length || 0,
        pending_count: statsData?.filter(po => po.status === 'pending').length || 0,
        approved_count: statsData?.filter(po => po.status === 'approved').length || 0,
        ordered_count: statsData?.filter(po => po.status === 'ordered').length || 0,
        partially_received_count: statsData?.filter(po => po.status === 'partially_received').length || 0,
        received_count: statsData?.filter(po => po.status === 'received').length || 0,
        cancelled_count: statsData?.filter(po => po.status === 'cancelled').length || 0,
        total_value: totalValue,
        pending_value: statsData?.filter(po => po.status === 'pending').reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0,
        received_value: statsData?.filter(po => po.status === 'received').reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0,
        avg_order_value: totalOrders > 0 ? totalValue / totalOrders : 0,
        suppliers_count: uniqueSuppliers.size
    };

    // Transform purchase orders to match expected interface
    const transformedPurchaseOrders = purchaseOrders?.map(po => ({
        id: po.id,
        po_number: po.po_number,
        supplier_id: po.supplier_id,
        status: po.status,
        order_date: po.order_date,
        expected_delivery_date: po.expected_delivery_date,
        actual_delivery_date: po.actual_delivery_date || null,
        subtotal: po.total_amount - (po.tax_amount || 0) - (po.shipping_cost || 0),
        tax_amount: po.tax_amount || 0,
        total_amount: po.total_amount,
        notes: po.notes,
        items: po.purchase_order_items?.map((item: any) => ({
            product_id: item.product_id,
            product_name: item.products?.name || 'Unknown Product',
            product_sku: item.products?.sku || 'Unknown SKU',
            quantity_ordered: item.quantity_ordered,
            quantity_received: item.quantity_received || 0,
            unit_cost: item.unit_cost,
            total_cost: item.total_cost,
            notes: item.notes
        })) || [],
        created_by: po.created_by,
        approved_by: null, // Not in current schema
        approved_at: null, // Not in current schema
        created_at: po.created_at,
        updated_at: po.updated_at
    })) || [];

    console.log('✅ [getPurchaseOrders] Successfully fetched purchase orders', {
        count: transformedPurchaseOrders.length,
        stats,
        timestamp: new Date().toISOString()
    });

    return {
        purchaseOrders: transformedPurchaseOrders,
        total: transformedPurchaseOrders.length,
        stats
    };
});

export const getPurchaseOrderById = query(
    z.string(),
    async (orderId: string): Promise<PurchaseOrder | null> => {
    console.log('🔍 [getPurchaseOrderById] Fetching purchase order by ID', { orderId, timestamp: new Date().toISOString() });
    
    const user = getAuthenticatedUser(false);
    const supabase = createSupabaseClient();
    
    const { data: purchaseOrder, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', orderId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            console.log('📝 [getPurchaseOrderById] Purchase order not found', { orderId });
            return null;
        }
        console.error('❌ [getPurchaseOrderById] Supabase error:', error);
        throw new Error(`Failed to fetch purchase order: ${error.message}`);
    }

    console.log('✅ [getPurchaseOrderById] Successfully fetched purchase order', { orderId, timestamp: new Date().toISOString() });

    return purchaseOrder;
});

// ========================
// COMMAND FUNCTIONS
// ========================

export const createPurchaseOrder = command(
    createPurchaseOrderSchema,
    async (orderData: CreatePurchaseOrder): Promise<PurchaseOrder> => {
        console.log('🔧 [createPurchaseOrder] Creating new purchase order', { orderData, timestamp: new Date().toISOString() });
        
        const user = getAuthenticatedUser(true);
        const supabase = createSupabaseClient();
        
        // Calculate totals
        const subtotal = orderData.items.reduce((sum, item) => sum + item.total_cost, 0);
        const totalAmount = subtotal; // Add tax calculation if needed
        
        // Generate PO number (simple format)
        const poNumber = `PO-${Date.now()}`;
        
        const newPurchaseOrder = {
            po_number: poNumber,
            supplier_id: orderData.supplier_id,
            status: 'draft' as const,
            order_date: new Date().toISOString(),
            expected_delivery_date: orderData.expected_delivery_date,
            subtotal,
            tax_amount: 0, // Calculate if needed
            total_amount: totalAmount,
            notes: orderData.notes,
            items: orderData.items,
            created_by: user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: createdOrder, error } = await supabase
            .from('purchase_orders')
            .insert(newPurchaseOrder)
            .select()
            .single();

        if (error) {
            console.error('❌ [createPurchaseOrder] Supabase error:', error);
            throw new Error(`Failed to create purchase order: ${error.message}`);
        }

        console.log('✅ [createPurchaseOrder] Successfully created purchase order', { 
            orderId: createdOrder.id, 
            timestamp: new Date().toISOString() 
        });

        return createdOrder;
    }
);

export const updatePurchaseOrder = command(
    z.object({
        orderId: z.string(),
        updates: updatePurchaseOrderSchema
    }),
    async (data: { orderId: string; updates: UpdatePurchaseOrder }): Promise<PurchaseOrder> => {
        console.log('🔧 [updatePurchaseOrder] Updating purchase order', { data, timestamp: new Date().toISOString() });
        
        const user = getAuthenticatedUser(true);
        const supabase = createSupabaseClient();
        
        const updateFields = {
            ...data.updates,
            updated_at: new Date().toISOString()
        };

        const { data: updatedOrder, error } = await supabase
            .from('purchase_orders')
            .update(updateFields)
            .eq('id', data.orderId)
            .select()
            .single();

        if (error) {
            console.error('❌ [updatePurchaseOrder] Supabase error:', error);
            throw new Error(`Failed to update purchase order: ${error.message}`);
        }

        console.log('✅ [updatePurchaseOrder] Successfully updated purchase order', { 
            orderId: updatedOrder.id,
            timestamp: new Date().toISOString() 
        });

        return updatedOrder;
    }
);

export const approvePurchaseOrder = command(
    approvePurchaseOrderSchema,
    async (approvalData: ApprovePurchaseOrder): Promise<PurchaseOrder> => {
        console.log('🔧 [approvePurchaseOrder] Processing approval', { approvalData, timestamp: new Date().toISOString() });
        
        const user = getAuthenticatedUser(true);
        const supabase = createSupabaseClient();
        
        const updateFields = {
            status: approvalData.approved ? 'approved' : 'cancelled',
            approved_by: approvalData.approved ? user.id : undefined,
            approved_at: approvalData.approved ? new Date().toISOString() : undefined,
            notes: approvalData.notes,
            updated_at: new Date().toISOString()
        };

        const { data: updatedOrder, error } = await supabase
            .from('purchase_orders')
            .update(updateFields)
            .eq('id', approvalData.purchase_order_id)
            .select()
            .single();

        if (error) {
            console.error('❌ [approvePurchaseOrder] Supabase error:', error);
            throw new Error(`Failed to process approval: ${error.message}`);
        }

        console.log('✅ [approvePurchaseOrder] Successfully processed approval', { 
            orderId: updatedOrder.id,
            approved: approvalData.approved,
            timestamp: new Date().toISOString() 
        });

        return updatedOrder;
    }
);

export const receiveItems = command(
    receiveItemsSchema,
    async (receiveData: ReceiveItems): Promise<PurchaseOrder> => {
        console.log('🔧 [receiveItems] Processing item receipt', { receiveData, timestamp: new Date().toISOString() });
        
        const user = getAuthenticatedUser(true);
        const supabase = createSupabaseClient();
        
        // First get the current PO to update items
        const { data: currentPO, error: fetchError } = await supabase
            .from('purchase_orders')
            .select('*')
            .eq('id', receiveData.purchase_order_id)
            .single();

        if (fetchError) {
            console.error('❌ [receiveItems] Failed to fetch current PO:', fetchError);
            throw new Error(`Failed to fetch purchase order: ${fetchError.message}`);
        }

        // Update the items with received quantities
        const updatedItems = currentPO.items.map((item: any) => {
            const receivedItem = receiveData.items.find(ri => ri.product_id === item.product_id);
            if (receivedItem) {
                return {
                    ...item,
                    quantity_received: (item.quantity_received || 0) + receivedItem.quantity_received,
                    unit_cost: receivedItem.unit_cost || item.unit_cost
                };
            }
            return item;
        });

        // Determine new status
        const allItemsReceived = updatedItems.every((item: any) => 
            item.quantity_received >= item.quantity_ordered
        );
        const someItemsReceived = updatedItems.some((item: any) => 
            (item.quantity_received || 0) > 0
        );
        
        let newStatus = currentPO.status;
        if (allItemsReceived) {
            newStatus = 'received';
        } else if (someItemsReceived) {
            newStatus = 'partially_received';
        }

        const updateFields = {
            items: updatedItems,
            status: newStatus,
            actual_delivery_date: receiveData.received_date || new Date().toISOString(),
            notes: receiveData.notes || currentPO.notes,
            updated_at: new Date().toISOString()
        };

        const { data: updatedOrder, error } = await supabase
            .from('purchase_orders')
            .update(updateFields)
            .eq('id', receiveData.purchase_order_id)
            .select()
            .single();

        if (error) {
            console.error('❌ [receiveItems] Supabase error:', error);
            throw new Error(`Failed to receive items: ${error.message}`);
        }

        // TODO: Update inventory quantities here
        // This should integrate with inventory management system

        console.log('✅ [receiveItems] Successfully processed item receipt', { 
            orderId: updatedOrder.id,
            newStatus,
            itemsCount: receiveData.items.length,
            timestamp: new Date().toISOString() 
        });

        return updatedOrder;
    }
);

export const deletePurchaseOrder = command(
    z.string(),
    async (orderId: string): Promise<void> => {
        console.log('🗑️ [deletePurchaseOrder] Deleting purchase order', { orderId, timestamp: new Date().toISOString() });
        
        const user = getAuthenticatedUser(true);
        const supabase = createSupabaseClient();
        
        const { error } = await supabase
            .from('purchase_orders')
            .delete()
            .eq('id', orderId);

        if (error) {
            console.error('❌ [deletePurchaseOrder] Supabase error:', error);
            throw new Error(`Failed to delete purchase order: ${error.message}`);
        }

        console.log('✅ [deletePurchaseOrder] Successfully deleted purchase order', { 
            orderId, 
            timestamp: new Date().toISOString() 
        });
    }
);