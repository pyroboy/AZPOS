import { getContext } from 'telefunc';
import { 
  discountInputSchema,
  discountFiltersSchema,
  validateDiscountSchema,
  type Discount,
  type DiscountFilters,
  type PaginatedDiscounts,
  type DiscountStats,
  type DiscountApplication
} from '$lib/types/discount.schema';
import { createSupabaseClient } from '$lib/server/db';

// Telefunc to get paginated discounts with filters
export async function onGetDiscounts(filters?: DiscountFilters): Promise<PaginatedDiscounts> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const supabase = createSupabaseClient();
  const validatedFilters = filters ? discountFiltersSchema.parse(filters) : {};
  
  const page = validatedFilters.page || 1;
  const limit = validatedFilters.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('discounts')
    .select('*', { count: 'exact' });

  // Apply filters
  if (validatedFilters.search) {
    query = query.or(`name.ilike.%${validatedFilters.search}%,description.ilike.%${validatedFilters.search}%,code.ilike.%${validatedFilters.search}%`);
  }
  
  if (validatedFilters.type) {
    query = query.eq('type', validatedFilters.type);
  }
  
  if (validatedFilters.is_active !== undefined) {
    query = query.eq('is_active', validatedFilters.is_active);
  }
  
  if (validatedFilters.is_expired !== undefined) {
    const now = new Date().toISOString();
    if (validatedFilters.is_expired) {
      query = query.lt('end_date', now);
    } else {
      query = query.gte('end_date', now);
    }
  }
  
  if (validatedFilters.has_code !== undefined) {
    if (validatedFilters.has_code) {
      query = query.not('code', 'is', null);
    } else {
      query = query.is('code', null);
    }
  }
  
  if (validatedFilters.applies_to) {
    query = query.eq('applies_to', validatedFilters.applies_to);
  }
  
  if (validatedFilters.date_from) {
    query = query.gte('start_date', validatedFilters.date_from);
  }
  
  if (validatedFilters.date_to) {
    query = query.lte('end_date', validatedFilters.date_to);
  }

  // Apply sorting
  const sortBy = validatedFilters.sort_by || 'created_at';
  const sortOrder = validatedFilters.sort_order || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: discounts, error, count } = await query;
  if (error) throw error;

  const totalPages = Math.ceil((count || 0) / limit);

  return {
    discounts: discounts?.map(discount => ({
      id: discount.id,
      name: discount.name,
      description: discount.description,
      code: discount.code,
      type: discount.type,
      value: discount.value,
      max_discount_amount: discount.max_discount_amount,
      minimum_order_amount: discount.minimum_order_amount,
      usage_limit: discount.usage_limit,
      usage_limit_per_customer: discount.usage_limit_per_customer,
      usage_count: discount.usage_count,
      start_date: discount.start_date,
      end_date: discount.end_date,
      is_active: discount.is_active,
      is_stackable: discount.is_stackable,
      applies_to: discount.applies_to,
      product_ids: discount.product_ids,
      category_ids: discount.category_ids,
      customer_eligibility: discount.customer_eligibility,
      conditions: discount.conditions,
      priority: discount.priority,
      created_at: discount.created_at,
      updated_at: discount.updated_at,
      created_by: discount.created_by,
      updated_by: discount.updated_by
    })) || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: totalPages,
      has_more: page < totalPages
    }
  };
}

// Telefunc to create a new discount
export async function onCreateDiscount(discountData: unknown): Promise<Discount> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const validatedData = discountInputSchema.parse(discountData);
  const supabase = createSupabaseClient();

  // Check if code already exists (if provided)
  if (validatedData.code) {
    const { data: existingDiscount } = await supabase
      .from('discounts')
      .select('id')
      .eq('code', validatedData.code)
      .single();

    if (existingDiscount) {
      throw new Error('Discount with this code already exists');
    }
  }

  const { data: newDiscount, error } = await supabase
    .from('discounts')
    .insert({
      ...validatedData,
      usage_count: 0,
      created_by: user.id,
      updated_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: newDiscount.id,
    name: newDiscount.name,
    description: newDiscount.description,
    code: newDiscount.code,
    type: newDiscount.type,
    value: newDiscount.value,
    max_discount_amount: newDiscount.max_discount_amount,
    minimum_order_amount: newDiscount.minimum_order_amount,
    usage_limit: newDiscount.usage_limit,
    usage_limit_per_customer: newDiscount.usage_limit_per_customer,
    usage_count: newDiscount.usage_count,
    start_date: newDiscount.start_date,
    end_date: newDiscount.end_date,
    is_active: newDiscount.is_active,
    is_stackable: newDiscount.is_stackable,
    applies_to: newDiscount.applies_to,
    product_ids: newDiscount.product_ids,
    category_ids: newDiscount.category_ids,
    customer_eligibility: newDiscount.customer_eligibility,
    conditions: newDiscount.conditions,
    priority: newDiscount.priority,
    created_at: newDiscount.created_at,
    updated_at: newDiscount.updated_at,
    created_by: newDiscount.created_by,
    updated_by: newDiscount.updated_by
  };
}

// Telefunc to validate and apply discount
export async function onValidateDiscount(validationData: unknown): Promise<DiscountApplication> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const validatedData = validateDiscountSchema.parse(validationData);
  const supabase = createSupabaseClient();

  let discount;
  
  // Find discount by code or ID
  if (validatedData.code) {
    const { data, error } = await supabase
      .from('discounts')
      .select('*')
      .eq('code', validatedData.code)
      .single();
    
    if (error || !data) {
      return {
        discount_id: '',
        discount_name: '',
        discount_type: 'percentage',
        discount_amount: 0,
        original_amount: validatedData.order_amount,
        final_amount: validatedData.order_amount,
        is_valid: false,
        error_message: 'Invalid discount code'
      };
    }
    discount = data;
  } else if (validatedData.discount_id) {
    const { data, error } = await supabase
      .from('discounts')
      .select('*')
      .eq('id', validatedData.discount_id)
      .single();
    
    if (error || !data) {
      return {
        discount_id: validatedData.discount_id,
        discount_name: '',
        discount_type: 'percentage',
        discount_amount: 0,
        original_amount: validatedData.order_amount,
        final_amount: validatedData.order_amount,
        is_valid: false,
        error_message: 'Discount not found'
      };
    }
    discount = data;
  } else {
    return {
      discount_id: '',
      discount_name: '',
      discount_type: 'percentage',
      discount_amount: 0,
      original_amount: validatedData.order_amount,
      final_amount: validatedData.order_amount,
      is_valid: false,
      error_message: 'No discount code or ID provided'
    };
  }

  // Validate discount
  const now = new Date();
  const startDate = new Date(discount.start_date);
  const endDate = new Date(discount.end_date);

  // Check if discount is active and within date range
  if (!discount.is_active) {
    return {
      discount_id: discount.id,
      discount_name: discount.name,
      discount_type: discount.type,
      discount_amount: 0,
      original_amount: validatedData.order_amount,
      final_amount: validatedData.order_amount,
      is_valid: false,
      error_message: 'Discount is not active'
    };
  }

  if (now < startDate) {
    return {
      discount_id: discount.id,
      discount_name: discount.name,
      discount_type: discount.type,
      discount_amount: 0,
      original_amount: validatedData.order_amount,
      final_amount: validatedData.order_amount,
      is_valid: false,
      error_message: 'Discount is not yet active'
    };
  }

  if (now > endDate) {
    return {
      discount_id: discount.id,
      discount_name: discount.name,
      discount_type: discount.type,
      discount_amount: 0,
      original_amount: validatedData.order_amount,
      final_amount: validatedData.order_amount,
      is_valid: false,
      error_message: 'Discount has expired'
    };
  }

  // Check usage limits
  if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
    return {
      discount_id: discount.id,
      discount_name: discount.name,
      discount_type: discount.type,
      discount_amount: 0,
      original_amount: validatedData.order_amount,
      final_amount: validatedData.order_amount,
      is_valid: false,
      error_message: 'Discount usage limit reached'
    };
  }

  // Check minimum order amount
  if (discount.minimum_order_amount && validatedData.order_amount < discount.minimum_order_amount) {
    return {
      discount_id: discount.id,
      discount_name: discount.name,
      discount_type: discount.type,
      discount_amount: 0,
      original_amount: validatedData.order_amount,
      final_amount: validatedData.order_amount,
      is_valid: false,
      error_message: `Minimum order amount of $${discount.minimum_order_amount} required`
    };
  }

  // Calculate discount amount
  let discountAmount = 0;
  
  switch (discount.type) {
    case 'percentage':
      discountAmount = (validatedData.order_amount * discount.value) / 100;
      if (discount.max_discount_amount) {
        discountAmount = Math.min(discountAmount, discount.max_discount_amount);
      }
      break;
    case 'fixed_amount':
      discountAmount = Math.min(discount.value, validatedData.order_amount);
      break;
    case 'free_shipping':
      // This would need to be handled based on shipping costs
      discountAmount = 0; // Placeholder
      break;
    default:
      discountAmount = 0;
  }

  const finalAmount = Math.max(0, validatedData.order_amount - discountAmount);

  return {
    discount_id: discount.id,
    discount_name: discount.name,
    discount_type: discount.type,
    discount_amount: discountAmount,
    original_amount: validatedData.order_amount,
    final_amount: finalAmount,
    is_valid: true
  };
}

// Telefunc to get discount statistics
export async function onGetDiscountStats(): Promise<DiscountStats> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const supabase = createSupabaseClient();

  const { data: discounts, error } = await supabase
    .from('discounts')
    .select('is_active, end_date, code, usage_count, type');

  if (error) throw error;

  const now = new Date();
  const stats = discounts?.reduce((acc, discount) => {
    acc.total_discounts++;
    acc.total_usage += discount.usage_count;
    
    if (discount.is_active && new Date(discount.end_date) > now) {
      acc.active_discounts++;
    } else {
      acc.expired_discounts++;
    }
    
    if (discount.code) {
      acc.code_based_discounts++;
    } else {
      acc.automatic_discounts++;
    }
    
    return acc;
  }, {
    total_discounts: 0,
    active_discounts: 0,
    expired_discounts: 0,
    code_based_discounts: 0,
    automatic_discounts: 0,
    total_usage: 0
  }) || {
    total_discounts: 0,
    active_discounts: 0,
    expired_discounts: 0,
    code_based_discounts: 0,
    automatic_discounts: 0,
    total_usage: 0
  };

  // Get usage data for savings calculation
  const { data: usageData } = await supabase
    .from('discount_usage')
    .select('discount_amount');

  const totalSavings = usageData?.reduce((sum, usage) => sum + usage.discount_amount, 0) || 0;

  return {
    ...stats,
    total_savings: totalSavings,
    avg_discount_amount: stats.total_usage > 0 ? totalSavings / stats.total_usage : 0
  };
}
