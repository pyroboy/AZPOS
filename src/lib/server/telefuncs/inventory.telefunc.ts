import { getContext } from 'telefunc';
import { 
  createInventoryMovementSchema,
  inventoryFiltersSchema,
  createStockCountSchema,
  type InventoryItem,
  type InventoryMovement,
  type InventoryLocation,
  type InventoryFilters,
  type InventoryValuation,
  type StockCount,
  type InventoryAlert
} from '$lib/types/inventory.schema';
import { createSupabaseClient } from '$lib/server/db';

// Telefunc to get inventory items with filters
export async function onGetInventoryItems(filters?: InventoryFilters): Promise<InventoryItem[]> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const supabase = createSupabaseClient();
  const validatedFilters = filters ? inventoryFiltersSchema.parse(filters) : {};

  let query = supabase
    .from('inventory_items')
    .select(`
      *,
      product:products(id, name, sku, min_stock_level),
      location:inventory_locations(id, name, code)
    `);

  // Apply filters
  if (validatedFilters.product_id) {
    query = query.eq('product_id', validatedFilters.product_id);
  }
  
  if (validatedFilters.location_id) {
    query = query.eq('location_id', validatedFilters.location_id);
  }
  
  if (validatedFilters.low_stock) {
    query = query.lt('quantity_available', 'products.min_stock_level');
  }
  
  if (validatedFilters.out_of_stock) {
    query = query.eq('quantity_available', 0);
  }
  
  if (validatedFilters.expired) {
    query = query.lt('expiry_date', new Date().toISOString());
  }
  
  if (validatedFilters.expiring_soon) {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    query = query.lt('expiry_date', thirtyDaysFromNow.toISOString());
  }
  
  if (validatedFilters.batch_number) {
    query = query.ilike('batch_number', `%${validatedFilters.batch_number}%`);
  }
  
  if (validatedFilters.search) {
    query = query.or(`products.name.ilike.%${validatedFilters.search}%,products.sku.ilike.%${validatedFilters.search}%`);
  }

  // Apply sorting
  const sortBy = validatedFilters.sort_by || 'product_name';
  const sortOrder = validatedFilters.sort_order || 'asc';
  
  switch (sortBy) {
    case 'product_name':
      query = query.order('products.name', { ascending: sortOrder === 'asc' });
      break;
    case 'quantity':
      query = query.order('quantity_available', { ascending: sortOrder === 'asc' });
      break;
    case 'last_movement':
      query = query.order('last_movement_at', { ascending: sortOrder === 'asc' });
      break;
    case 'expiry_date':
      query = query.order('expiry_date', { ascending: sortOrder === 'asc' });
      break;
    default:
      query = query.order('updated_at', { ascending: false });
  }

  const { data: items, error } = await query;
  if (error) throw error;

  return items?.map(item => ({
    id: item.id,
    product_id: item.product_id,
    location_id: item.location_id,
    batch_number: item.batch_number,
    expiry_date: item.expiry_date,
    quantity_on_hand: item.quantity_on_hand,
    quantity_reserved: item.quantity_reserved,
    quantity_available: item.quantity_available,
    cost_per_unit: item.cost_per_unit,
    last_counted_at: item.last_counted_at,
    last_movement_at: item.last_movement_at,
    created_at: item.created_at,
    updated_at: item.updated_at
  })) || [];
}

// Telefunc to create inventory movement
export async function onCreateInventoryMovement(movementData: unknown): Promise<InventoryMovement> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const validatedData = createInventoryMovementSchema.parse(movementData);
  const supabase = createSupabaseClient();

  // Create the movement record
  const { data: movement, error } = await supabase
    .from('inventory_movements')
    .insert({
      ...validatedData,
      user_id: user.id,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // Update inventory quantities based on movement type
  await updateInventoryQuantities(supabase, validatedData.product_id, validatedData.location_id);

  return {
    id: movement.id,
    product_id: movement.product_id,
    location_id: movement.location_id,
    movement_type: movement.movement_type,
    transaction_type: movement.transaction_type,
    quantity: movement.quantity,
    unit_cost: movement.unit_cost,
    reference_id: movement.reference_id,
    reference_type: movement.reference_type,
    notes: movement.notes,
    user_id: movement.user_id,
    created_at: movement.created_at
  };
}

// Telefunc to get inventory movements/history
export async function onGetInventoryMovements(productId?: string, locationId?: string): Promise<InventoryMovement[]> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const supabase = createSupabaseClient();

  let query = supabase
    .from('inventory_movements')
    .select(`
      *,
      product:products(name, sku),
      location:inventory_locations(name, code),
      user:users(full_name)
    `)
    .order('created_at', { ascending: false });

  if (productId) {
    query = query.eq('product_id', productId);
  }
  
  if (locationId) {
    query = query.eq('location_id', locationId);
  }

  const { data: movements, error } = await query;
  if (error) throw error;

  return movements?.map(movement => ({
    id: movement.id,
    product_id: movement.product_id,
    location_id: movement.location_id,
    movement_type: movement.movement_type,
    transaction_type: movement.transaction_type,
    quantity: movement.quantity,
    unit_cost: movement.unit_cost,
    reference_id: movement.reference_id,
    reference_type: movement.reference_type,
    notes: movement.notes,
    user_id: movement.user_id,
    created_at: movement.created_at
  })) || [];
}

// Telefunc to get inventory valuation
export async function onGetInventoryValuation(): Promise<InventoryValuation> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const supabase = createSupabaseClient();

  // Get inventory summary data
  const { data: items, error } = await supabase
    .from('inventory_items')
    .select(`
      quantity_available,
      cost_per_unit,
      expiry_date,
      product:products(min_stock_level)
    `);

  if (error) throw error;

  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const valuation = items?.reduce((acc, item) => {
    acc.total_items++;
    acc.total_quantity += item.quantity_available;
    acc.total_value += item.quantity_available * item.cost_per_unit;

    if (item.quantity_available === 0) {
      acc.out_of_stock_items++;
    } else if (item.product?.min_stock_level && item.quantity_available < item.product.min_stock_level) {
      acc.low_stock_items++;
    }

    if (item.expiry_date) {
      const expiryDate = new Date(item.expiry_date);
      if (expiryDate < now) {
        acc.expired_items++;
      } else if (expiryDate < thirtyDaysFromNow) {
        acc.expiring_soon_items++;
      }
    }

    return acc;
  }, {
    total_items: 0,
    total_quantity: 0,
    total_value: 0,
    low_stock_items: 0,
    out_of_stock_items: 0,
    expired_items: 0,
    expiring_soon_items: 0
  }) || {
    total_items: 0,
    total_quantity: 0,
    total_value: 0,
    low_stock_items: 0,
    out_of_stock_items: 0,
    expired_items: 0,
    expiring_soon_items: 0
  };

  // Get locations count
  const { count: locationsCount } = await supabase
    .from('inventory_locations')
    .select('*', { count: 'exact', head: true });

  return {
    ...valuation,
    locations_count: locationsCount || 0,
    last_updated: new Date().toISOString()
  };
}

// Telefunc to create stock count
export async function onCreateStockCount(countData: unknown): Promise<StockCount> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const validatedData = createStockCountSchema.parse(countData);
  const supabase = createSupabaseClient();

  // Calculate variances
  const itemsWithVariance = validatedData.items.map(item => ({
    ...item,
    variance: item.counted_quantity - item.expected_quantity
  }));

  const { data: stockCount, error } = await supabase
    .from('stock_counts')
    .insert({
      location_id: validatedData.location_id,
      status: 'completed',
      count_date: validatedData.count_date,
      counted_by: user.id,
      notes: validatedData.notes,
      items: itemsWithVariance,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // Create inventory movements for variances
  for (const item of itemsWithVariance) {
    if (item.variance !== 0) {
      await supabase.from('inventory_movements').insert({
        product_id: item.product_id,
        location_id: validatedData.location_id,
        movement_type: item.variance > 0 ? 'in' : 'out',
        transaction_type: 'count',
        quantity: Math.abs(item.variance),
        reference_id: stockCount.id,
        reference_type: 'count',
        notes: `Stock count adjustment: ${item.notes || 'No notes'}`,
        user_id: user.id,
        created_at: new Date().toISOString()
      });

      // Update inventory quantities
      await updateInventoryQuantities(supabase, item.product_id, validatedData.location_id);
    }
  }

  return {
    id: stockCount.id,
    location_id: stockCount.location_id,
    status: stockCount.status,
    count_date: stockCount.count_date,
    counted_by: stockCount.counted_by,
    notes: stockCount.notes,
    items: stockCount.items,
    created_at: stockCount.created_at,
    updated_at: stockCount.updated_at
  };
}

// Telefunc to get inventory alerts
export async function onGetInventoryAlerts(): Promise<InventoryAlert[]> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const supabase = createSupabaseClient();

  const { data: alerts, error } = await supabase
    .from('inventory_alerts')
    .select(`
      *,
      product:products(name, sku)
    `)
    .eq('is_acknowledged', false)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return alerts?.map(alert => ({
    id: alert.id,
    product_id: alert.product_id,
    alert_type: alert.alert_type,
    threshold_value: alert.threshold_value,
    current_value: alert.current_value,
    message: alert.message,
    is_acknowledged: alert.is_acknowledged,
    acknowledged_by: alert.acknowledged_by,
    acknowledged_at: alert.acknowledged_at,
    created_at: alert.created_at
  })) || [];
}

// Helper function to update inventory quantities
async function updateInventoryQuantities(supabase: any, productId: string, locationId?: string) {
  // Recalculate quantities based on movements
  const { data: movements } = await supabase
    .from('inventory_movements')
    .select('movement_type, quantity')
    .eq('product_id', productId)
    .eq('location_id', locationId || null);

  if (!movements) return;

  const totalIn = movements
    .filter((m: any) => m.movement_type === 'in')
    .reduce((sum: number, m: any) => sum + m.quantity, 0);

  const totalOut = movements
    .filter((m: any) => m.movement_type === 'out')
    .reduce((sum: number, m: any) => sum + m.quantity, 0);

  const quantityOnHand = totalIn - totalOut;
  const quantityAvailable = Math.max(0, quantityOnHand); // Assuming no reservations for now

  // Update or insert inventory item
  await supabase
    .from('inventory_items')
    .upsert({
      product_id: productId,
      location_id: locationId,
      quantity_on_hand: quantityOnHand,
      quantity_available: quantityAvailable,
      last_movement_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
}
