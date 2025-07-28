import { getContext } from 'telefunc';
import { 
  createTransactionSchema,
  transactionFiltersSchema,
  refundRequestSchema,
  type Transaction,
  type TransactionFilters,
  type PaginatedTransactions,
  type TransactionStats,
  type RefundRequest,
  type Receipt
} from '$lib/types/transaction.schema';
import { createSupabaseClient } from '$lib/server/db';

// Helper function to generate transaction number
function generateTransactionNumber(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${timestamp.slice(-6)}-${random}`;
}

// Telefunc to get paginated transactions with filters
export async function onGetTransactions(filters?: TransactionFilters): Promise<PaginatedTransactions> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const supabase = createSupabaseClient();
  const validatedFilters = filters ? transactionFiltersSchema.parse(filters) : {};
  
  const page = validatedFilters.page || 1;
  const limit = validatedFilters.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('transactions')
    .select('*', { count: 'exact' });

  // Apply filters
  if (validatedFilters.search) {
    query = query.or(`transaction_number.ilike.%${validatedFilters.search}%,customer_name.ilike.%${validatedFilters.search}%,customer_email.ilike.%${validatedFilters.search}%`);
  }
  
  if (validatedFilters.status && validatedFilters.status !== 'all') {
    query = query.eq('status', validatedFilters.status);
  }
  
  if (validatedFilters.customer_id) {
    query = query.eq('customer_id', validatedFilters.customer_id);
  }
  
  if (validatedFilters.processed_by) {
    query = query.eq('processed_by', validatedFilters.processed_by);
  }
  
  if (validatedFilters.payment_type) {
    query = query.contains('payment_methods', [{ type: validatedFilters.payment_type }]);
  }
  
  if (validatedFilters.date_from) {
    query = query.gte('processed_at', validatedFilters.date_from);
  }
  
  if (validatedFilters.date_to) {
    query = query.lte('processed_at', validatedFilters.date_to);
  }
  
  if (validatedFilters.amount_min) {
    query = query.gte('total_amount', validatedFilters.amount_min);
  }
  
  if (validatedFilters.amount_max) {
    query = query.lte('total_amount', validatedFilters.amount_max);
  }
  
  if (validatedFilters.has_refund !== undefined) {
    if (validatedFilters.has_refund) {
      query = query.gt('refund_amount', 0);
    } else {
      query = query.eq('refund_amount', 0);
    }
  }

  // Apply sorting
  const sortBy = validatedFilters.sort_by || 'processed_at';
  const sortOrder = validatedFilters.sort_order || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: transactions, error, count } = await query;
  if (error) throw error;

  const totalPages = Math.ceil((count || 0) / limit);

  return {
    transactions: transactions || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: totalPages,
      has_more: page < totalPages
    }
  };
}

// Telefunc to get a single transaction by ID
export async function onGetTransaction(transactionId: string): Promise<Transaction> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const supabase = createSupabaseClient();

  const { data: transaction, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (error) throw error;
  if (!transaction) throw new Error('Transaction not found');

  return transaction;
}

// Telefunc to create a new transaction
export async function onCreateTransaction(transactionData: unknown): Promise<Transaction> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const validatedData = createTransactionSchema.parse(transactionData);
  const supabase = createSupabaseClient();

  // Validate payment methods total matches transaction total
  const paymentTotal = validatedData.payment_methods.reduce((sum, payment) => sum + payment.amount, 0);
  if (Math.abs(paymentTotal - validatedData.total_amount) > 0.01) {
    throw new Error('Payment methods total does not match transaction total');
  }

  const transactionNumber = generateTransactionNumber();
  const now = new Date().toISOString();

  const { data: newTransaction, error } = await supabase
    .from('transactions')
    .insert({
      transaction_number: transactionNumber,
      customer_id: validatedData.customer_id,
      customer_name: validatedData.customer_name,
      customer_email: validatedData.customer_email,
      customer_phone: validatedData.customer_phone,
      status: 'completed',
      items: validatedData.items,
      subtotal: validatedData.subtotal,
      discount_amount: validatedData.discount_amount,
      tax_amount: validatedData.tax_amount,
      tip_amount: validatedData.tip_amount,
      total_amount: validatedData.total_amount,
      payment_methods: validatedData.payment_methods,
      refund_amount: 0,
      notes: validatedData.notes,
      receipt_email: validatedData.receipt_email,
      receipt_phone: validatedData.receipt_phone,
      processed_by: user.id,
      processed_at: now,
      created_at: now,
      updated_at: now
    })
    .select()
    .single();

  if (error) throw error;

  // Update inventory for sold items
  for (const item of validatedData.items) {
    await supabase.rpc('update_inventory_stock', {
      p_product_id: item.product_id,
      p_quantity_change: -item.quantity,
      p_movement_type: 'sale',
      p_reference_id: newTransaction.id,
      p_notes: `Sale - Transaction ${transactionNumber}`
    });
  }

  return newTransaction;
}

// Telefunc to process refund
export async function onProcessRefund(refundData: unknown): Promise<Transaction> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const validatedData = refundRequestSchema.parse(refundData);
  const supabase = createSupabaseClient();

  // Get the original transaction
  const { data: transaction, error: fetchError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', validatedData.transaction_id)
    .single();

  if (fetchError || !transaction) {
    throw new Error('Transaction not found');
  }

  if (transaction.status === 'cancelled' || transaction.status === 'refunded') {
    throw new Error('Transaction cannot be refunded');
  }

  let refundAmount = validatedData.refund_amount;
  
  // Calculate refund amount if not provided
  if (!refundAmount && validatedData.items) {
    refundAmount = validatedData.items.reduce((sum, item) => sum + item.refund_amount, 0);
  } else if (!refundAmount) {
    // Full refund
    refundAmount = transaction.total_amount - transaction.refund_amount;
  }

  const totalRefundAmount = transaction.refund_amount + refundAmount;
  
  if (totalRefundAmount > transaction.total_amount) {
    throw new Error('Refund amount exceeds transaction total');
  }

  // Determine new status
  let newStatus = transaction.status;
  if (totalRefundAmount >= transaction.total_amount) {
    newStatus = 'refunded';
  } else if (totalRefundAmount > 0) {
    newStatus = 'partially_refunded';
  }

  // Update transaction
  const { data: updatedTransaction, error: updateError } = await supabase
    .from('transactions')
    .update({
      status: newStatus,
      refund_amount: totalRefundAmount,
      updated_at: new Date().toISOString()
    })
    .eq('id', validatedData.transaction_id)
    .select()
    .single();

  if (updateError) throw updateError;

  // Create refund record
  await supabase
    .from('transaction_refunds')
    .insert({
      transaction_id: validatedData.transaction_id,
      refund_amount: refundAmount,
      reason: validatedData.reason,
      notes: validatedData.notes,
      processed_by: user.id,
      processed_at: new Date().toISOString()
    });

  // Update inventory for refunded items
  if (validatedData.items) {
    for (const item of validatedData.items) {
      await supabase.rpc('update_inventory_stock', {
        p_product_id: item.product_id,
        p_quantity_change: item.quantity,
        p_movement_type: 'return',
        p_reference_id: validatedData.transaction_id,
        p_notes: `Refund - ${validatedData.reason}`
      });
    }
  }

  return updatedTransaction;
}

// Telefunc to get transaction statistics
export async function onGetTransactionStats(dateFrom?: string, dateTo?: string): Promise<TransactionStats> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const supabase = createSupabaseClient();

  let query = supabase
    .from('transactions')
    .select('status, total_amount, refund_amount, payment_methods, items, processed_at, customer_id');

  if (dateFrom) {
    query = query.gte('processed_at', dateFrom);
  }
  
  if (dateTo) {
    query = query.lte('processed_at', dateTo);
  }

  const { data: transactions, error } = await query;
  if (error) throw error;

  const stats = transactions?.reduce((acc, transaction) => {
    acc.total_transactions++;
    
    switch (transaction.status) {
      case 'completed':
        acc.completed_transactions++;
        break;
      case 'cancelled':
        acc.cancelled_transactions++;
        break;
      case 'refunded':
      case 'partially_refunded':
        acc.refunded_transactions++;
        break;
    }
    
    acc.total_revenue += transaction.total_amount;
    acc.total_refunds += transaction.refund_amount;
    
    // Count items sold
    if (transaction.items) {
      acc.total_items_sold += transaction.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    }
    
    // Track unique customers
    if (transaction.customer_id && !acc.customer_ids.has(transaction.customer_id)) {
      acc.customer_ids.add(transaction.customer_id);
      acc.unique_customers++;
    }
    
    // Payment method breakdown
    if (transaction.payment_methods) {
      transaction.payment_methods.forEach((payment: any) => {
        if (!acc.payment_method_breakdown[payment.type]) {
          acc.payment_method_breakdown[payment.type] = { count: 0, total_amount: 0, percentage: 0 };
        }
        acc.payment_method_breakdown[payment.type].count++;
        acc.payment_method_breakdown[payment.type].total_amount += payment.amount;
      });
    }
    
    return acc;
  }, {
    total_transactions: 0,
    completed_transactions: 0,
    cancelled_transactions: 0,
    refunded_transactions: 0,
    total_revenue: 0,
    total_refunds: 0,
    net_revenue: 0,
    avg_transaction_value: 0,
    total_items_sold: 0,
    unique_customers: 0,
    customer_ids: new Set(),
    payment_method_breakdown: {} as Record<string, { count: number; total_amount: number; percentage: number }>
  }) || {
    total_transactions: 0,
    completed_transactions: 0,
    cancelled_transactions: 0,
    refunded_transactions: 0,
    total_revenue: 0,
    total_refunds: 0,
    net_revenue: 0,
    avg_transaction_value: 0,
    total_items_sold: 0,
    unique_customers: 0,
    customer_ids: new Set(),
    payment_method_breakdown: {} as Record<string, { count: number; total_amount: number; percentage: number }>
  };

  // Calculate derived values
  stats.net_revenue = stats.total_revenue - stats.total_refunds;
  stats.avg_transaction_value = stats.completed_transactions > 0 ? stats.total_revenue / stats.completed_transactions : 0;

  // Calculate payment method percentages
  Object.keys(stats.payment_method_breakdown).forEach(method => {
    stats.payment_method_breakdown[method].percentage = 
      stats.total_revenue > 0 ? (stats.payment_method_breakdown[method].total_amount / stats.total_revenue) * 100 : 0;
  });

  // Remove the Set from the return object
  const { customer_ids, ...finalStats } = stats;

  return finalStats;
}

// Telefunc to generate receipt
export async function onGenerateReceipt(transactionId: string): Promise<Receipt> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const transaction = await onGetTransaction(transactionId);
  
  // Get business info (this would typically come from settings)
  const businessInfo = {
    name: 'AZPOS Store',
    address: '123 Main St, City, State 12345',
    phone: '(555) 123-4567',
    email: 'info@azpos.com',
    tax_id: 'TAX123456789'
  };

  return {
    transaction,
    business_info: businessInfo,
    receipt_number: `RCP-${transaction.transaction_number}`,
    generated_at: new Date().toISOString()
  };
}
