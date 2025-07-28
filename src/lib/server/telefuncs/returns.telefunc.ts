import { getContext } from 'telefunc';
import { 
  newReturnSchema, 
  updateReturnStatusSchema,
  returnFiltersSchema,
  type EnhancedReturnRecord,
  type ReturnStats,
  type ReturnFilters 
} from '$lib/types/returns.schema';
import { createSupabaseClient } from '$lib/server/db';

// Type guard for Supabase errors
interface SupabaseError {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
}

function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === 'object' && 
    error !== null && 
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

// Telefunc to get all returns with optional filters
export async function onGetReturns(filters?: ReturnFilters): Promise<EnhancedReturnRecord[]> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const supabase = createSupabaseClient();
  
  // Build query with filters
  let query = supabase
    .from('returns')
    .select(`
      *,
      processed_by_user:users!returns_processed_by_fkey(full_name)
    `)
    .order('created_at', { ascending: false });

  // Apply filters if provided
  if (filters) {
    const validatedFilters = returnFiltersSchema.parse(filters);
    
    if (validatedFilters.status && validatedFilters.status !== 'all') {
      query = query.eq('status', validatedFilters.status);
    }
    
    if (validatedFilters.reason && validatedFilters.reason !== 'all') {
      query = query.eq('reason', validatedFilters.reason);
    }
    
    if (validatedFilters.date_from) {
      query = query.gte('created_at', validatedFilters.date_from);
    }
    
    if (validatedFilters.date_to) {
      query = query.lte('created_at', validatedFilters.date_to);
    }
    
    if (validatedFilters.customer_name) {
      query = query.ilike('customer_name', `%${validatedFilters.customer_name}%`);
    }
    
    if (validatedFilters.order_id) {
      query = query.ilike('order_id', `%${validatedFilters.order_id}%`);
    }
  }

  // Apply RBAC - regular users can only see their own returns
  if (user.role !== 'admin' && user.role !== 'manager') {
    query = query.eq('user_id', user.id);
  }

  const { data: returns, error } = await query;
  if (error) throw error;

  return returns?.map(returnRecord => ({
    id: returnRecord.id,
    order_id: returnRecord.order_id,
    customer_name: returnRecord.customer_name,
    items: returnRecord.items,
    return_date: returnRecord.return_date,
    status: returnRecord.status,
    reason: returnRecord.reason,
    notes: returnRecord.notes,
    admin_notes: returnRecord.admin_notes,
    processed_by: returnRecord.processed_by,
    processed_at: returnRecord.processed_at,
    user_id: returnRecord.user_id,
    created_at: returnRecord.created_at,
    updated_at: returnRecord.updated_at
  })) || [];
}

// Telefunc to create a new return
export async function onCreateReturn(returnData: unknown): Promise<EnhancedReturnRecord> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const validatedData = newReturnSchema.parse(returnData);
  const supabase = createSupabaseClient();

  // Validate that the order exists and belongs to the user (if not admin)
  if (user.role !== 'admin' && user.role !== 'manager') {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id')
      .eq('id', validatedData.order_id)
      .eq('user_id', user.id)
      .single();

    if (orderError || !order) {
      throw new Error('Order not found or access denied');
    }
  }

  // Create the return record
  const { data: newReturn, error } = await supabase
    .from('returns')
    .insert({
      order_id: validatedData.order_id,
      customer_name: validatedData.customer_name,
      items: validatedData.items,
      reason: validatedData.reason,
      notes: validatedData.notes,
      status: 'pending',
      user_id: user.id,
      return_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: newReturn.id,
    order_id: newReturn.order_id,
    customer_name: newReturn.customer_name,
    items: newReturn.items,
    return_date: newReturn.return_date,
    status: newReturn.status,
    reason: newReturn.reason,
    notes: newReturn.notes,
    admin_notes: newReturn.admin_notes,
    processed_by: newReturn.processed_by,
    processed_at: newReturn.processed_at,
    user_id: newReturn.user_id,
    created_at: newReturn.created_at,
    updated_at: newReturn.updated_at
  };
}

// Telefunc to update return status (admin only)
export async function onUpdateReturnStatus(updateData: unknown): Promise<EnhancedReturnRecord> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin access required');
  }

  const validatedData = updateReturnStatusSchema.parse(updateData);
  const supabase = createSupabaseClient();

  // Update the return with new status and admin info
  const updatePayload: Record<string, unknown> = {
    status: validatedData.status,
    updated_at: new Date().toISOString()
  };

  // Add admin notes if provided
  if (validatedData.admin_notes) {
    updatePayload.admin_notes = validatedData.admin_notes;
  }

  // Set processed info for final statuses
  if (['approved', 'rejected', 'completed'].includes(validatedData.status)) {
    updatePayload.processed_by = user.id;
    updatePayload.processed_at = new Date().toISOString();
  }

  const { data: updatedReturn, error } = await supabase
    .from('returns')
    .update(updatePayload)
    .eq('id', validatedData.return_id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: updatedReturn.id,
    order_id: updatedReturn.order_id,
    customer_name: updatedReturn.customer_name,
    items: updatedReturn.items,
    return_date: updatedReturn.return_date,
    status: updatedReturn.status,
    reason: updatedReturn.reason,
    notes: updatedReturn.notes,
    admin_notes: updatedReturn.admin_notes,
    processed_by: updatedReturn.processed_by,
    processed_at: updatedReturn.processed_at,
    user_id: updatedReturn.user_id,
    created_at: updatedReturn.created_at,
    updated_at: updatedReturn.updated_at
  };
}

// Telefunc to get return by ID
export async function onGetReturnById(returnId: string): Promise<EnhancedReturnRecord | null> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const supabase = createSupabaseClient();
  
  let query = supabase
    .from('returns')
    .select(`
      *,
      processed_by_user:users!returns_processed_by_fkey(full_name)
    `)
    .eq('id', returnId);

  // Apply RBAC - regular users can only see their own returns
  if (user.role !== 'admin' && user.role !== 'manager') {
    query = query.eq('user_id', user.id);
  }

  const { data: returnRecord, error } = await query.single();
  
  if (error) {
    if (isSupabaseError(error) && error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error;
  }

  return {
    id: returnRecord.id,
    order_id: returnRecord.order_id,
    customer_name: returnRecord.customer_name,
    items: returnRecord.items,
    return_date: returnRecord.return_date,
    status: returnRecord.status,
    reason: returnRecord.reason,
    notes: returnRecord.notes,
    admin_notes: returnRecord.admin_notes,
    processed_by: returnRecord.processed_by,
    processed_at: returnRecord.processed_at,
    user_id: returnRecord.user_id,
    created_at: returnRecord.created_at,
    updated_at: returnRecord.updated_at
  };
}

// Telefunc to get return statistics (admin only)
export async function onGetReturnStats(): Promise<ReturnStats> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin access required');
  }

  const supabase = createSupabaseClient();

  // Get return counts by status
  const { data: statusCounts, error: statusError } = await supabase
    .from('returns')
    .select('status')
    .then(({ data, error }) => {
      if (error) throw error;
      
      const counts = {
        total_returns: data?.length || 0,
        pending_count: 0,
        approved_count: 0,
        rejected_count: 0,
        completed_count: 0,
        processing_count: 0
      };

      data?.forEach(record => {
        switch (record.status) {
          case 'pending':
            counts.pending_count++;
            break;
          case 'approved':
            counts.approved_count++;
            break;
          case 'rejected':
            counts.rejected_count++;
            break;
          case 'completed':
            counts.completed_count++;
            break;
          case 'processing':
            counts.processing_count++;
            break;
        }
      });

      return { data: counts, error: null };
    });

  if (statusError) throw statusError;

  // Calculate average processing time for completed returns
  const { data: processingTimes, error: timeError } = await supabase
    .from('returns')
    .select('created_at, processed_at')
    .not('processed_at', 'is', null);

  let avgProcessingTime: number | undefined;
  
  if (!timeError && processingTimes && processingTimes.length > 0) {
    const totalHours = processingTimes.reduce((sum, record) => {
      const created = new Date(record.created_at);
      const processed = new Date(record.processed_at);
      const hours = (processed.getTime() - created.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);
    
    avgProcessingTime = totalHours / processingTimes.length;
  }

  return {
    ...statusCounts,
    total_value: 0, // TODO: Calculate based on return items and product prices
    avg_processing_time: avgProcessingTime
  };
}

// Telefunc to delete a return (admin only, soft delete)
export async function onDeleteReturn(returnId: string): Promise<void> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin access required');
  }

  const supabase = createSupabaseClient();

  // Soft delete by updating status to 'cancelled'
  const { error } = await supabase
    .from('returns')
    .update({ 
      status: 'cancelled',
      updated_at: new Date().toISOString(),
      processed_by: user.id,
      processed_at: new Date().toISOString()
    })
    .eq('id', returnId);

  if (error) throw error;
}
