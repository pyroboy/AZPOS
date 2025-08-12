import { query, mutation } from '@sveltejs/kit';
import { createSupabaseClient } from '$lib/supabase/client';
import { getAuthenticatedUser } from '$lib/auth/server';
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

// ========================
// QUERY FUNCTIONS
// ========================

export const getReturns = query(async (filters?: ReturnFilters): Promise<{
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
            order_id,
            customer_name,
            items,
            return_date,
            status,
            reason,
            notes,
            admin_notes,
            processed_by,
            processed_at,
            user_id,
            created_at,
            updated_at
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
            queryBuilder = queryBuilder.gte('return_date', validatedFilters.date_from);
        }
        
        if (validatedFilters.date_to) {
            queryBuilder = queryBuilder.lte('return_date', validatedFilters.date_to);
        }
        
        if (validatedFilters.customer_name) {
            queryBuilder = queryBuilder.ilike('customer_name', `%${validatedFilters.customer_name}%`);
        }
        
        if (validatedFilters.order_id) {
            queryBuilder = queryBuilder.ilike('order_id', `%${validatedFilters.order_id}%`);
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
        .select('status, items')
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
        completed_count: statsData?.filter(r => r.status === 'completed').length || 0,
        processing_count: statsData?.filter(r => r.status === 'processing').length || 0,
        total_value: 0, // Would need to calculate from items and product prices
        avg_processing_time: undefined // Would need to calculate from processed_at - created_at
    };

    console.log('✅ [getReturns] Successfully fetched returns', {
        count: returns?.length || 0,
        stats,
        timestamp: new Date().toISOString()
    });

    return {
        returns: returns || [],
        total: returns?.length || 0,
        stats
    };
});

export const getReturnById = query(async (returnId: string): Promise<EnhancedReturnRecord | null> => {
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

export const createReturn = mutation(async (returnData: NewReturnInput): Promise<EnhancedReturnRecord> => {
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

export const updateReturnStatus = mutation(async (updateData: UpdateReturnStatusInput): Promise<EnhancedReturnRecord> => {
    console.log('🔧 [updateReturnStatus] Updating return status', { updateData, timestamp: new Date().toISOString() });
    
    const user = getAuthenticatedUser(true);
    const supabase = createSupabaseClient();
    
    const validatedData = updateReturnStatusSchema.parse(updateData);
    
    const updateFields = {
        status: validatedData.status,
        admin_notes: validatedData.admin_notes,
        processed_by: user.id,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const { data: updatedReturn, error } = await supabase
        .from('returns')
        .update(updateFields)
        .eq('id', validatedData.return_id)
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

export const deleteReturn = mutation(async (returnId: string): Promise<void> => {
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

export const bulkUpdateReturnStatus = mutation(async (data: {
    returnIds: string[];
    status: 'pending' | 'approved' | 'rejected' | 'completed' | 'processing';
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