import { query, command, getRequestEvent } from '$app/server';
import { createSupabaseClient } from '$lib/server/db';
import { 
    returnFiltersSchema, 
    newReturnSchema, 
    updateReturnStatusSchema,
    type EnhancedReturnRecord,
    type ReturnFilters,
    type NewReturnInput,
    type UpdateReturnStatusInput,
    type ReturnStats
} from '$lib/types/returns.schema';
import { z } from 'zod';

console.log('🔄 [returns.remote] Loading returns remote functions');
// Updated: 2025-08-12 - fixed exports

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

export const getReturns = query(
    returnFiltersSchema.optional(),
    async (filters?: ReturnFilters): Promise<{
        returns: EnhancedReturnRecord[];
        total: number;
        stats: ReturnStats;
    }> => {
    console.log('🔍 [getReturns] Fetching returns with filters', { filters, timestamp: new Date().toISOString() });
    
    const user = getAuthenticatedUser(false);
    const supabase = createSupabaseClient();
    
    let queryBuilder = supabase
        .from('returns')
        .select(`
            id,
            return_number,
            customer_name,
            customer_email,
            customer_phone,
            status,
            reason,
            description,
            total_refund_amount,
            processed_by,
            processed_at,
            notes,
            created_at,
            updated_at,
            return_items (
                id,
                product_id,
                quantity,
                unit_price,
                refund_amount,
                condition,
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
        const validatedFilters = returnFiltersSchema.parse(filters);
        
        if (validatedFilters.status && validatedFilters.status !== 'all') {
            queryBuilder = queryBuilder.eq('status', validatedFilters.status);
        }
        
        if (validatedFilters.reason && validatedFilters.reason !== 'all') {
            queryBuilder = queryBuilder.eq('reason', validatedFilters.reason);
        }
        
        if (validatedFilters.date_from) {
            queryBuilder = queryBuilder.gte('created_at', validatedFilters.date_from);
        }
        
        if (validatedFilters.date_to) {
            queryBuilder = queryBuilder.lte('created_at', validatedFilters.date_to);
        }
        
        if (validatedFilters.customer_name) {
            queryBuilder = queryBuilder.ilike('customer_name', `%${validatedFilters.customer_name}%`);
        }
        
        if (validatedFilters.order_id) {
            queryBuilder = queryBuilder.ilike('return_number', `%${validatedFilters.order_id}%`);
        }
    }

    const { data: returns, error: returnsError } = await queryBuilder;
    
    if (returnsError) {
        console.error('❌ [getReturns] Supabase error:', returnsError);
        throw new Error(`Failed to fetch returns: ${returnsError.message}`);
    }

    // Get stats separately
    const { data: statsData, error: statsError } = await supabase
        .from('returns')
        .select('status, total_refund_amount')
        .order('created_at', { ascending: false });

    if (statsError) {
        console.error('❌ [getReturns] Stats error:', statsError);
        throw new Error(`Failed to fetch return stats: ${statsError.message}`);
    }

    // Calculate stats
    const stats: ReturnStats = {
        total_returns: statsData?.length || 0,
        pending_count: statsData?.filter(r => r.status === 'pending').length || 0,
        approved_count: statsData?.filter(r => r.status === 'approved').length || 0,
        rejected_count: statsData?.filter(r => r.status === 'rejected').length || 0,
        processed_count: statsData?.filter(r => r.status === 'processed').length || 0,
        total_value: statsData?.reduce((sum, r) => sum + (r.total_refund_amount || 0), 0) || 0,
        avg_processing_time: undefined // Would need to calculate from processed_at - created_at
    };

    // Transform returns to match expected interface
    const transformedReturns = returns?.map(returnRecord => ({
        id: returnRecord.id,
        order_id: returnRecord.return_number, // Map return_number to order_id for compatibility
        customer_name: returnRecord.customer_name || '',
        items: returnRecord.return_items?.map((item: any) => ({
            product_id: item.product_id,
            product_name: item.products?.name || 'Unknown Product',
            product_sku: item.products?.sku || 'Unknown SKU',
            quantity: item.quantity
        })) || [],
        return_date: returnRecord.created_at, // Use created_at as return_date
        status: returnRecord.status,
        reason: returnRecord.reason,
        notes: returnRecord.description || '', // Map description to notes
        admin_notes: returnRecord.notes || '', // Map notes to admin_notes
        processed_by: returnRecord.processed_by,
        processed_at: returnRecord.processed_at,
        user_id: returnRecord.created_by, // Assuming created_by is the user_id
        created_at: returnRecord.created_at,
        updated_at: returnRecord.updated_at
    })) || [];

    console.log('✅ [getReturns] Successfully fetched returns', {
        count: returns?.length || 0,
        stats,
        timestamp: new Date().toISOString()
    });

    return {
        returns: transformedReturns,
        total: transformedReturns.length,
        stats
    };
});

export const getReturnById = query(
    z.string(),
    async (returnId: string): Promise<EnhancedReturnRecord | null> => {
    console.log('🔍 [getReturnById] Fetching return by ID', { returnId, timestamp: new Date().toISOString() });
    
    const user = getAuthenticatedUser(false);
    const supabase = createSupabaseClient();
    
    const { data: returnRecord, error } = await supabase
        .from('returns')
        .select('*')
        .eq('id', returnId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            console.log('📝 [getReturnById] Return not found', { returnId });
            return null;
        }
        console.error('❌ [getReturnById] Supabase error:', error);
        throw new Error(`Failed to fetch return: ${error.message}`);
    }

    console.log('✅ [getReturnById] Successfully fetched return', { returnId, timestamp: new Date().toISOString() });

    return returnRecord;
});

// ========================
// MUTATION FUNCTIONS  
// ========================

export const createReturn = command(
    newReturnSchema,
    async (returnData: NewReturnInput): Promise<EnhancedReturnRecord> => {
    console.log('🔧 [createReturn] Creating new return', { returnData, timestamp: new Date().toISOString() });
    
    const user = getAuthenticatedUser(true);
    const supabase = createSupabaseClient();
    
    const validatedData = newReturnSchema.parse(returnData);
    
    const newReturn = {
        order_id: validatedData.order_id,
        customer_name: validatedData.customer_name,
        items: validatedData.items,
        reason: validatedData.reason,
        notes: validatedData.notes,
        status: 'pending' as const,
        return_date: new Date().toISOString(),
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data: createdReturn, error } = await supabase
        .from('returns')
        .insert(newReturn)
        .select()
        .single();

    if (error) {
        console.error('❌ [createReturn] Supabase error:', error);
        throw new Error(`Failed to create return: ${error.message}`);
    }

    console.log('✅ [createReturn] Successfully created return', { 
        returnId: createdReturn.id, 
        timestamp: new Date().toISOString() 
    });

    return createdReturn;
});

// Update return status command function
export const updateReturnStatus = command(
    updateReturnStatusSchema,
    async (updateData: UpdateReturnStatusInput): Promise<EnhancedReturnRecord> => {
    console.log('🔧 [updateReturnStatus] Updating return status', { updateData, timestamp: new Date().toISOString() });
    
    const user = getAuthenticatedUser(true);
    const supabase = createSupabaseClient();
    
    // updateData is already validated by the command schema
    
    const updateFields = {
        status: updateData.status,
        admin_notes: updateData.admin_notes,
        processed_by: user.id,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data: updatedReturn, error } = await supabase
        .from('returns')
        .update(updateFields)
        .eq('id', updateData.return_id)
        .select()
        .single();

    if (error) {
        console.error('❌ [updateReturnStatus] Supabase error:', error);
        throw new Error(`Failed to update return status: ${error.message}`);
    }

    console.log('✅ [updateReturnStatus] Successfully updated return status', { 
        returnId: updatedReturn.id,
        newStatus: updatedReturn.status,
        timestamp: new Date().toISOString() 
    });

    return updatedReturn;
});

export const deleteReturn = command(
    z.string(),
    async (returnId: string): Promise<void> => {
    console.log('🗑️ [deleteReturn] Deleting return', { returnId, timestamp: new Date().toISOString() });
    
    const user = getAuthenticatedUser(true);
    const supabase = createSupabaseClient();
    
    const { error } = await supabase
        .from('returns')
        .delete()
        .eq('id', returnId);

    if (error) {
        console.error('❌ [deleteReturn] Supabase error:', error);
        throw new Error(`Failed to delete return: ${error.message}`);
    }

    console.log('✅ [deleteReturn] Successfully deleted return', { 
        returnId, 
        timestamp: new Date().toISOString() 
    });
});

// ========================
// BULK OPERATIONS
// ========================

const bulkUpdateSchema = z.object({
    returnIds: z.array(z.string()).min(1),
    status: z.enum(['pending', 'approved', 'rejected', 'processed']),
    adminNotes: z.string().optional()
});

export const bulkUpdateReturnStatus = command(
    bulkUpdateSchema,
    async (data: {
    returnIds: string[];
    status: 'pending' | 'approved' | 'rejected' | 'processed';
    adminNotes?: string;
}): Promise<EnhancedReturnRecord[]> => {
    console.log('🔧 [bulkUpdateReturnStatus] Bulk updating return statuses', { 
        returnIds: data.returnIds, 
        newStatus: data.status,
        timestamp: new Date().toISOString() 
    });
    
    const user = getAuthenticatedUser(true);
    const supabase = createSupabaseClient();
    
    const updateFields = {
        status: data.status,
        admin_notes: data.adminNotes,
        processed_by: user.id,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data: updatedReturns, error } = await supabase
        .from('returns')
        .update(updateFields)
        .in('id', data.returnIds)
        .select();

    if (error) {
        console.error('❌ [bulkUpdateReturnStatus] Supabase error:', error);
        throw new Error(`Failed to bulk update return statuses: ${error.message}`);
    }

    console.log('✅ [bulkUpdateReturnStatus] Successfully updated return statuses', { 
        count: updatedReturns?.length || 0,
        timestamp: new Date().toISOString() 
    });

    return updatedReturns || [];
});