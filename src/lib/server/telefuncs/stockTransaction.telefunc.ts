import { getContext } from 'telefunc';
import { 
  stockTransactionCreateSchema,
  bulkAdjustmentSchema,
  stockTransferSchema,
  stockTransactionFiltersSchema,
  type StockTransaction,
  type StockTransactionCreate,
  type BulkAdjustment,
  type StockTransfer,
  type StockTransactionFilters,
  type PaginatedStockTransactions,
  type StockTransactionStats,
  type StockValuation,
  type StockAgingReport
} from '$lib/types/stockTransaction.schema';
import { createSupabaseClient } from '$lib/server/db';

// Telefunc to create stock transaction
export async function onCreateStockTransaction(transactionData: unknown): Promise<StockTransaction> {
  const { user } = getContext();
  if (!user || !['admin', 'manager', 'inventory_manager'].includes(user.role)) {
    throw new Error('Not authorized - inventory management access required');
  }

  const validatedData = stockTransactionCreateSchema.parse(transactionData);
  const supabase = createSupabaseClient();

  // Verify product exists
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, current_stock')
    .eq('id', validatedData.product_id)
    .single();

  if (productError || !product) {
    throw new Error('Product not found');
  }

  const now = new Date().toISOString();
  const transactionId = crypto.randomUUID();

  // Calculate new stock level
  let newStockLevel = product.current_stock;
  switch (validatedData.movement_type) {
    case 'stock_in':
    case 'adjustment_in':
    case 'transfer_in':
      newStockLevel += validatedData.quantity;
      break;
    case 'stock_out':
    case 'adjustment_out':
    case 'transfer_out':
    case 'sale':
    case 'waste':
    case 'damage':
      newStockLevel -= validatedData.quantity;
      break;
  }

  // Check for negative stock if not allowed
  const { data: settings } = await supabase
    .from('settings')
    .select('inventory')
    .single();

  const allowNegativeStock = settings?.inventory?.tracking?.allow_negative_stock || false;
  
  if (!allowNegativeStock && newStockLevel < 0) {
    throw new Error('Insufficient stock - negative stock not allowed');
  }

  const stockTransaction: StockTransaction = {
    id: transactionId,
    product_id: validatedData.product_id,
    movement_type: validatedData.movement_type,
    quantity: validatedData.quantity,
    unit_cost: validatedData.unit_cost,
    total_cost: validatedData.quantity * (validatedData.unit_cost || 0),
    reference_number: validatedData.reference_number,
    reference_type: validatedData.reference_type,
    reference_id: validatedData.reference_id,
    notes: validatedData.notes,
    location_id: validatedData.location_id,
    supplier_id: validatedData.supplier_id,
    batch_number: validatedData.batch_number,
    expiry_date: validatedData.expiry_date,
    previous_stock: product.current_stock,
    new_stock: newStockLevel,
    processed_by: user.id,
    processed_at: now,
    created_at: now
  };

  // Start transaction
  const { data: savedTransaction, error: transactionError } = await supabase
    .from('stock_transactions')
    .insert({
      id: stockTransaction.id,
      product_id: stockTransaction.product_id,
      movement_type: stockTransaction.movement_type,
      quantity: stockTransaction.quantity,
      unit_cost: stockTransaction.unit_cost,
      total_cost: stockTransaction.total_cost,
      reference_number: stockTransaction.reference_number,
      reference_type: stockTransaction.reference_type,
      reference_id: stockTransaction.reference_id,
      notes: stockTransaction.notes,
      location_id: stockTransaction.location_id,
      supplier_id: stockTransaction.supplier_id,
      batch_number: stockTransaction.batch_number,
      expiry_date: stockTransaction.expiry_date,
      previous_stock: stockTransaction.previous_stock,
      new_stock: stockTransaction.new_stock,
      processed_by: stockTransaction.processed_by,
      processed_at: stockTransaction.processed_at,
      created_at: stockTransaction.created_at
    })
    .select()
    .single();

  if (transactionError) throw transactionError;

  // Update product stock level
  const { error: updateError } = await supabase
    .from('products')
    .update({
      current_stock: newStockLevel,
      updated_at: now
    })
    .eq('id', validatedData.product_id);

  if (updateError) throw updateError;

  return stockTransaction;
}

// Telefunc to process bulk adjustment
export async function onProcessBulkAdjustment(adjustmentData: unknown): Promise<StockTransaction[]> {
  const { user } = getContext();
  if (!user || !['admin', 'manager', 'inventory_manager'].includes(user.role)) {
    throw new Error('Not authorized - inventory management access required');
  }

  const validatedData = bulkAdjustmentSchema.parse(adjustmentData);
  const supabase = createSupabaseClient();

  const transactions: StockTransaction[] = [];
  const now = new Date().toISOString();

  // Process each adjustment
  for (const adjustment of validatedData.adjustments) {
    // Get current product stock
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, current_stock')
      .eq('id', adjustment.product_id)
      .single();

    if (productError || !product) {
      throw new Error(`Product not found: ${adjustment.product_id}`);
    }

    const adjustmentQuantity = adjustment.new_quantity - product.current_stock;
    const movementType = adjustmentQuantity >= 0 ? 'adjustment_in' : 'adjustment_out';

    const transaction: StockTransaction = {
      id: crypto.randomUUID(),
      product_id: adjustment.product_id,
      movement_type: movementType,
      quantity: Math.abs(adjustmentQuantity),
      unit_cost: adjustment.unit_cost,
      total_cost: Math.abs(adjustmentQuantity) * (adjustment.unit_cost || 0),
      reference_number: validatedData.reference_number,
      reference_type: 'bulk_adjustment',
      notes: adjustment.reason || validatedData.notes,
      previous_stock: product.current_stock,
      new_stock: adjustment.new_quantity,
      processed_by: user.id,
      processed_at: now,
      created_at: now
    };

    transactions.push(transaction);
  }

  // Insert all transactions
  const { data: savedTransactions, error: insertError } = await supabase
    .from('stock_transactions')
    .insert(transactions.map(t => ({
      id: t.id,
      product_id: t.product_id,
      movement_type: t.movement_type,
      quantity: t.quantity,
      unit_cost: t.unit_cost,
      total_cost: t.total_cost,
      reference_number: t.reference_number,
      reference_type: t.reference_type,
      notes: t.notes,
      previous_stock: t.previous_stock,
      new_stock: t.new_stock,
      processed_by: t.processed_by,
      processed_at: t.processed_at,
      created_at: t.created_at
    })))
    .select();

  if (insertError) throw insertError;

  // Update product stock levels
  for (const adjustment of validatedData.adjustments) {
    const { error: updateError } = await supabase
      .from('products')
      .update({
        current_stock: adjustment.new_quantity,
        updated_at: now
      })
      .eq('id', adjustment.product_id);

    if (updateError) throw updateError;
  }

  return transactions;
}

// Telefunc to process stock transfer
export async function onProcessStockTransfer(transferData: unknown): Promise<StockTransaction[]> {
  const { user } = getContext();
  if (!user || !['admin', 'manager', 'inventory_manager'].includes(user.role)) {
    throw new Error('Not authorized - inventory management access required');
  }

  const validatedData = stockTransferSchema.parse(transferData);
  const supabase = createSupabaseClient();

  // Verify source product has sufficient stock
  const { data: sourceProduct, error: sourceError } = await supabase
    .from('products')
    .select('id, current_stock')
    .eq('id', validatedData.from_product_id)
    .single();

  if (sourceError || !sourceProduct) {
    throw new Error('Source product not found');
  }

  if (sourceProduct.current_stock < validatedData.quantity) {
    throw new Error('Insufficient stock in source product');
  }

  // Verify destination product exists
  const { data: destProduct, error: destError } = await supabase
    .from('products')
    .select('id, current_stock')
    .eq('id', validatedData.to_product_id)
    .single();

  if (destError || !destProduct) {
    throw new Error('Destination product not found');
  }

  const now = new Date().toISOString();
  const transferRef = `TRF-${Date.now()}`;

  // Create transfer out transaction
  const transferOut: StockTransaction = {
    id: crypto.randomUUID(),
    product_id: validatedData.from_product_id,
    movement_type: 'transfer_out',
    quantity: validatedData.quantity,
    unit_cost: validatedData.unit_cost,
    total_cost: validatedData.quantity * (validatedData.unit_cost || 0),
    reference_number: transferRef,
    reference_type: 'stock_transfer',
    reference_id: validatedData.to_product_id,
    notes: validatedData.notes,
    location_id: validatedData.from_location_id,
    previous_stock: sourceProduct.current_stock,
    new_stock: sourceProduct.current_stock - validatedData.quantity,
    processed_by: user.id,
    processed_at: now,
    created_at: now
  };

  // Create transfer in transaction
  const transferIn: StockTransaction = {
    id: crypto.randomUUID(),
    product_id: validatedData.to_product_id,
    movement_type: 'transfer_in',
    quantity: validatedData.quantity,
    unit_cost: validatedData.unit_cost,
    total_cost: validatedData.quantity * (validatedData.unit_cost || 0),
    reference_number: transferRef,
    reference_type: 'stock_transfer',
    reference_id: validatedData.from_product_id,
    notes: validatedData.notes,
    location_id: validatedData.to_location_id,
    previous_stock: destProduct.current_stock,
    new_stock: destProduct.current_stock + validatedData.quantity,
    processed_by: user.id,
    processed_at: now,
    created_at: now
  };

  const transactions = [transferOut, transferIn];

  // Insert transactions
  const { data: savedTransactions, error: insertError } = await supabase
    .from('stock_transactions')
    .insert(transactions.map(t => ({
      id: t.id,
      product_id: t.product_id,
      movement_type: t.movement_type,
      quantity: t.quantity,
      unit_cost: t.unit_cost,
      total_cost: t.total_cost,
      reference_number: t.reference_number,
      reference_type: t.reference_type,
      reference_id: t.reference_id,
      notes: t.notes,
      location_id: t.location_id,
      previous_stock: t.previous_stock,
      new_stock: t.new_stock,
      processed_by: t.processed_by,
      processed_at: t.processed_at,
      created_at: t.created_at
    })))
    .select();

  if (insertError) throw insertError;

  // Update product stock levels
  const { error: updateSourceError } = await supabase
    .from('products')
    .update({
      current_stock: transferOut.new_stock,
      updated_at: now
    })
    .eq('id', validatedData.from_product_id);

  if (updateSourceError) throw updateSourceError;

  const { error: updateDestError } = await supabase
    .from('products')
    .update({
      current_stock: transferIn.new_stock,
      updated_at: now
    })
    .eq('id', validatedData.to_product_id);

  if (updateDestError) throw updateDestError;

  return transactions;
}

// Telefunc to get paginated stock transactions
export async function onGetStockTransactions(filters?: StockTransactionFilters): Promise<PaginatedStockTransactions> {
  const { user } = getContext();
  if (!user || !['admin', 'manager', 'inventory_manager', 'cashier'].includes(user.role)) {
    throw new Error('Not authorized');
  }

  const supabase = createSupabaseClient();
  const validatedFilters = filters ? stockTransactionFiltersSchema.parse(filters) : {};
  
  const page = validatedFilters.page || 1;
  const limit = validatedFilters.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('stock_transactions')
    .select(`
      *,
      product:products(id, name, sku),
      supplier:suppliers(id, name),
      processed_by_user:users!processed_by(id, name)
    `, { count: 'exact' });

  // Apply filters
  if (validatedFilters.product_id) {
    query = query.eq('product_id', validatedFilters.product_id);
  }
  
  if (validatedFilters.movement_type) {
    query = query.eq('movement_type', validatedFilters.movement_type);
  }
  
  if (validatedFilters.reference_type) {
    query = query.eq('reference_type', validatedFilters.reference_type);
  }
  
  if (validatedFilters.supplier_id) {
    query = query.eq('supplier_id', validatedFilters.supplier_id);
  }
  
  if (validatedFilters.location_id) {
    query = query.eq('location_id', validatedFilters.location_id);
  }
  
  if (validatedFilters.date_from) {
    query = query.gte('processed_at', validatedFilters.date_from);
  }
  
  if (validatedFilters.date_to) {
    query = query.lte('processed_at', validatedFilters.date_to);
  }

  if (validatedFilters.reference_number) {
    query = query.ilike('reference_number', `%${validatedFilters.reference_number}%`);
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

// Telefunc to get stock transaction statistics
export async function onGetStockTransactionStats(): Promise<StockTransactionStats> {
  const { user } = getContext();
  if (!user || !['admin', 'manager', 'inventory_manager'].includes(user.role)) {
    throw new Error('Not authorized - inventory management access required');
  }

  const supabase = createSupabaseClient();

  const { data: transactions, error } = await supabase
    .from('stock_transactions')
    .select('movement_type, quantity, total_cost, processed_at');

  if (error) throw error;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = transactions?.reduce((acc, transaction) => {
    acc.total_transactions++;
    
    const transactionDate = new Date(transaction.processed_at);
    if (transactionDate >= today) {
      acc.transactions_today++;
    }
    
    // Movement type breakdown
    if (!acc.movement_type_breakdown[transaction.movement_type]) {
      acc.movement_type_breakdown[transaction.movement_type] = { 
        count: 0, 
        total_quantity: 0, 
        total_value: 0,
        percentage: 0 
      };
    }
    
    acc.movement_type_breakdown[transaction.movement_type].count++;
    acc.movement_type_breakdown[transaction.movement_type].total_quantity += transaction.quantity;
    acc.movement_type_breakdown[transaction.movement_type].total_value += transaction.total_cost || 0;
    
    // Calculate totals
    if (['stock_in', 'adjustment_in', 'transfer_in'].includes(transaction.movement_type)) {
      acc.total_stock_in += transaction.quantity;
      acc.total_value_in += transaction.total_cost || 0;
    } else {
      acc.total_stock_out += transaction.quantity;
      acc.total_value_out += transaction.total_cost || 0;
    }
    
    acc.total_value += transaction.total_cost || 0;
    
    return acc;
  }, {
    total_transactions: 0,
    transactions_today: 0,
    total_stock_in: 0,
    total_stock_out: 0,
    total_value_in: 0,
    total_value_out: 0,
    total_value: 0,
    net_stock_movement: 0,
    net_value_movement: 0,
    movement_type_breakdown: {} as Record<string, any>
  }) || {
    total_transactions: 0,
    transactions_today: 0,
    total_stock_in: 0,
    total_stock_out: 0,
    total_value_in: 0,
    total_value_out: 0,
    total_value: 0,
    net_stock_movement: 0,
    net_value_movement: 0,
    movement_type_breakdown: {}
  };

  // Calculate net movements
  stats.net_stock_movement = stats.total_stock_in - stats.total_stock_out;
  stats.net_value_movement = stats.total_value_in - stats.total_value_out;

  // Calculate movement type percentages
  Object.keys(stats.movement_type_breakdown).forEach(type => {
    stats.movement_type_breakdown[type].percentage = 
      stats.total_transactions > 0 ? (stats.movement_type_breakdown[type].count / stats.total_transactions) * 100 : 0;
  });

  return stats;
}

// Telefunc to get stock valuation report
export async function onGetStockValuation(): Promise<StockValuation[]> {
  const { user } = getContext();
  if (!user || !['admin', 'manager', 'inventory_manager'].includes(user.role)) {
    throw new Error('Not authorized - inventory management access required');
  }

  const supabase = createSupabaseClient();

  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      sku,
      current_stock,
      cost_price,
      selling_price,
      category:categories(name)
    `);

  if (error) throw error;

  const valuation: StockValuation[] = (products || []).map(product => {
    const stock_value = product.current_stock * (product.cost_price || 0);
    const retail_value = product.current_stock * (product.selling_price || 0);
    const potential_profit = retail_value - stock_value;
    const margin_percentage = retail_value > 0 ? (potential_profit / retail_value) * 100 : 0;

    return {
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      category_name: product.category?.name,
      current_stock: product.current_stock,
      cost_price: product.cost_price || 0,
      selling_price: product.selling_price || 0,
      stock_value,
      retail_value,
      potential_profit,
      margin_percentage
    };
  });

  return valuation;
}

// Telefunc to get stock aging report
export async function onGetStockAgingReport(): Promise<StockAgingReport[]> {
  const { user } = getContext();
  if (!user || !['admin', 'manager', 'inventory_manager'].includes(user.role)) {
    throw new Error('Not authorized - inventory management access required');
  }

  const supabase = createSupabaseClient();

  // Get stock transactions with batch info
  const { data: transactions, error } = await supabase
    .from('stock_transactions')
    .select(`
      product_id,
      quantity,
      batch_number,
      expiry_date,
      processed_at,
      movement_type,
      product:products(id, name, sku)
    `)
    .in('movement_type', ['stock_in', 'adjustment_in', 'transfer_in'])
    .order('processed_at', { ascending: true });

  if (error) throw error;

  // Group by product and batch
  const batchGroups: Record<string, any> = {};

  transactions?.forEach(transaction => {
    const key = `${transaction.product_id}-${transaction.batch_number || 'no-batch'}`;
    
    if (!batchGroups[key]) {
      batchGroups[key] = {
        product_id: transaction.product_id,
        product_name: transaction.product.name,
        sku: transaction.product.sku,
        batch_number: transaction.batch_number,
        expiry_date: transaction.expiry_date,
        first_received: transaction.processed_at,
        total_quantity: 0,
        remaining_quantity: 0
      };
    }
    
    batchGroups[key].total_quantity += transaction.quantity;
    batchGroups[key].remaining_quantity += transaction.quantity; // Simplified - would need to account for outgoing transactions
  });

  const agingReport: StockAgingReport[] = Object.values(batchGroups).map((batch: any) => {
    const receivedDate = new Date(batch.first_received);
    const now = new Date();
    const ageInDays = Math.floor((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let aging_category: 'fresh' | 'aging' | 'old' | 'expired' = 'fresh';
    
    if (batch.expiry_date) {
      const expiryDate = new Date(batch.expiry_date);
      if (expiryDate < now) {
        aging_category = 'expired';
      } else if (ageInDays > 90) {
        aging_category = 'old';
      } else if (ageInDays > 30) {
        aging_category = 'aging';
      }
    } else {
      if (ageInDays > 180) {
        aging_category = 'old';
      } else if (ageInDays > 90) {
        aging_category = 'aging';
      }
    }

    return {
      product_id: batch.product_id,
      product_name: batch.product_name,
      sku: batch.sku,
      batch_number: batch.batch_number,
      expiry_date: batch.expiry_date,
      first_received: batch.first_received,
      age_in_days: ageInDays,
      aging_category,
      total_quantity: batch.total_quantity,
      remaining_quantity: batch.remaining_quantity
    };
  });

  return agingReport;
}
