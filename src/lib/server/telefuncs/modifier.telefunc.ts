import { getContext } from 'telefunc';
import { 
  modifierInputSchema,
  modifierFiltersSchema,
  validateModifierSelectionSchema,
  type Modifier,
  type ModifierFilters,
  type ModifierStats
} from '$lib/types/modifier.schema';
import { createSupabaseClient } from '$lib/server/db';

// Telefunc to get modifiers with filters
export async function onGetModifiers(filters?: ModifierFilters): Promise<Modifier[]> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const supabase = createSupabaseClient();
  const validatedFilters = filters ? modifierFiltersSchema.parse(filters) : {};

  let query = supabase
    .from('modifiers')
    .select(`
      *,
      modifier_options (
        id,
        name,
        price_adjustment,
        is_default,
        is_available,
        sort_order,
        sku_suffix,
        image_url
      )
    `);

  // Apply filters
  if (validatedFilters.search) {
    query = query.or(`name.ilike.%${validatedFilters.search}%,description.ilike.%${validatedFilters.search}%`);
  }
  
  if (validatedFilters.type) {
    query = query.eq('type', validatedFilters.type);
  }
  
  if (validatedFilters.is_active !== undefined) {
    query = query.eq('is_active', validatedFilters.is_active);
  }
  
  if (validatedFilters.is_required !== undefined) {
    query = query.eq('is_required', validatedFilters.is_required);
  }
  
  if (validatedFilters.applies_to) {
    query = query.eq('applies_to', validatedFilters.applies_to);
  }
  
  if (validatedFilters.product_id) {
    query = query.or(`applies_to.eq.all_products,product_ids.cs.{${validatedFilters.product_id}}`);
  }
  
  if (validatedFilters.category_id) {
    query = query.or(`applies_to.eq.all_products,category_ids.cs.{${validatedFilters.category_id}}`);
  }

  // Apply sorting
  const sortBy = validatedFilters.sort_by || 'sort_order';
  const sortOrder = validatedFilters.sort_order || 'asc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  const { data: modifiers, error } = await query;
  if (error) throw error;

  return modifiers?.map(modifier => ({
    id: modifier.id,
    name: modifier.name,
    description: modifier.description,
    type: modifier.type,
    is_required: modifier.is_required,
    is_active: modifier.is_active,
    min_selections: modifier.min_selections,
    max_selections: modifier.max_selections,
    sort_order: modifier.sort_order,
    applies_to: modifier.applies_to,
    product_ids: modifier.product_ids,
    category_ids: modifier.category_ids,
    options: modifier.modifier_options || [],
    created_at: modifier.created_at,
    updated_at: modifier.updated_at,
    created_by: modifier.created_by,
    updated_by: modifier.updated_by
  })) || [];
}

// Telefunc to create a new modifier
export async function onCreateModifier(modifierData: unknown): Promise<Modifier> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const validatedData = modifierInputSchema.parse(modifierData);
  const supabase = createSupabaseClient();

  const { data: newModifier, error } = await supabase
    .from('modifiers')
    .insert({
      name: validatedData.name,
      description: validatedData.description,
      type: validatedData.type,
      is_required: validatedData.is_required,
      is_active: validatedData.is_active,
      min_selections: validatedData.min_selections,
      max_selections: validatedData.max_selections,
      sort_order: validatedData.sort_order,
      applies_to: validatedData.applies_to,
      product_ids: validatedData.product_ids,
      category_ids: validatedData.category_ids,
      created_by: user.id,
      updated_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  // Create modifier options if provided
  if (validatedData.options && validatedData.options.length > 0) {
    const { error: optionsError } = await supabase
      .from('modifier_options')
      .insert(
        validatedData.options.map(option => ({
          ...option,
          modifier_id: newModifier.id
        }))
      );

    if (optionsError) throw optionsError;
  }

  // Fetch the complete modifier with options
  const { data: completeModifier, error: fetchError } = await supabase
    .from('modifiers')
    .select(`
      *,
      modifier_options (
        id,
        name,
        price_adjustment,
        is_default,
        is_available,
        sort_order,
        sku_suffix,
        image_url
      )
    `)
    .eq('id', newModifier.id)
    .single();

  if (fetchError) throw fetchError;

  return {
    id: completeModifier.id,
    name: completeModifier.name,
    description: completeModifier.description,
    type: completeModifier.type,
    is_required: completeModifier.is_required,
    is_active: completeModifier.is_active,
    min_selections: completeModifier.min_selections,
    max_selections: completeModifier.max_selections,
    sort_order: completeModifier.sort_order,
    applies_to: completeModifier.applies_to,
    product_ids: completeModifier.product_ids,
    category_ids: completeModifier.category_ids,
    options: completeModifier.modifier_options || [],
    created_at: completeModifier.created_at,
    updated_at: completeModifier.updated_at,
    created_by: completeModifier.created_by,
    updated_by: completeModifier.updated_by
  };
}

// Telefunc to update a modifier
export async function onUpdateModifier(modifierId: string, modifierData: unknown): Promise<Modifier> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const validatedData = modifierInputSchema.parse(modifierData);
  const supabase = createSupabaseClient();

  const { error } = await supabase
    .from('modifiers')
    .update({
      ...validatedData,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', modifierId)
    .select()
    .single();

  if (error) throw error;

  // Update modifier options if provided
  if (validatedData.options) {
    // Delete existing options
    await supabase
      .from('modifier_options')
      .delete()
      .eq('modifier_id', modifierId);

    // Insert new options
    if (validatedData.options.length > 0) {
      const { error: optionsError } = await supabase
        .from('modifier_options')
        .insert(
          validatedData.options.map(option => ({
            ...option,
            modifier_id: modifierId
          }))
        );

      if (optionsError) throw optionsError;
    }
  }

  // Fetch the complete modifier with options
  const { data: completeModifier, error: fetchError } = await supabase
    .from('modifiers')
    .select(`
      *,
      modifier_options (
        id,
        name,
        price_adjustment,
        is_default,
        is_available,
        sort_order,
        sku_suffix,
        image_url
      )
    `)
    .eq('id', modifierId)
    .single();

  if (fetchError) throw fetchError;

  return {
    id: completeModifier.id,
    name: completeModifier.name,
    description: completeModifier.description,
    type: completeModifier.type,
    is_required: completeModifier.is_required,
    is_active: completeModifier.is_active,
    min_selections: completeModifier.min_selections,
    max_selections: completeModifier.max_selections,
    sort_order: completeModifier.sort_order,
    applies_to: completeModifier.applies_to,
    product_ids: completeModifier.product_ids,
    category_ids: completeModifier.category_ids,
    options: completeModifier.modifier_options || [],
    created_at: completeModifier.created_at,
    updated_at: completeModifier.updated_at,
    created_by: completeModifier.created_by,
    updated_by: completeModifier.updated_by
  };
}

// Telefunc to validate modifier selection
export async function onValidateModifierSelection(validationData: unknown): Promise<{ is_valid: boolean; error_message?: string; total_price_adjustment: number }> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const validatedData = validateModifierSelectionSchema.parse(validationData);
  const supabase = createSupabaseClient();

  const { data: modifier, error } = await supabase
    .from('modifiers')
    .select(`
      *,
      modifier_options (
        id,
        name,
        price_adjustment,
        is_available
      )
    `)
    .eq('id', validatedData.modifier_id)
    .single();

  if (error || !modifier) {
    return {
      is_valid: false,
      error_message: 'Modifier not found',
      total_price_adjustment: 0
    };
  }

  if (!modifier.is_active) {
    return {
      is_valid: false,
      error_message: 'Modifier is not active',
      total_price_adjustment: 0
    };
  }

  let totalPriceAdjustment = 0;

  // Validate based on modifier type
  switch (modifier.type) {
    case 'single_select':
      if (!validatedData.selected_options || validatedData.selected_options.length !== 1) {
        return {
          is_valid: false,
          error_message: 'Exactly one option must be selected',
          total_price_adjustment: 0
        };
      }
      break;

    case 'multi_select': {
      const selectedCount = validatedData.selected_options?.length || 0;
      
      if (selectedCount < modifier.min_selections) {
        return {
          is_valid: false,
          error_message: `At least ${modifier.min_selections} options must be selected`,
          total_price_adjustment: 0
        };
      }
      
      if (modifier.max_selections && selectedCount > modifier.max_selections) {
        return {
          is_valid: false,
          error_message: `At most ${modifier.max_selections} options can be selected`,
          total_price_adjustment: 0
        };
      }
      break;
    }

    case 'text_input':
      if (modifier.is_required && !validatedData.text_value) {
        return {
          is_valid: false,
          error_message: 'Text input is required',
          total_price_adjustment: 0
        };
      }
      break;

    case 'number_input':
      if (modifier.is_required && validatedData.number_value === undefined) {
        return {
          is_valid: false,
          error_message: 'Number input is required',
          total_price_adjustment: 0
        };
      }
      break;
  }

  // Calculate price adjustment for selected options
  if (validatedData.selected_options) {
    for (const optionId of validatedData.selected_options) {
      const option = modifier.modifier_options.find((opt: { id: string; name: string; is_available: boolean; price_adjustment: number }) => opt.id === optionId);
      if (!option) {
        return {
          is_valid: false,
          error_message: `Option ${optionId} not found`,
          total_price_adjustment: 0
        };
      }
      if (!option.is_available) {
        return {
          is_valid: false,
          error_message: `Option ${option.name} is not available`,
          total_price_adjustment: 0
        };
      }
      totalPriceAdjustment += option.price_adjustment;
    }
  }

  return {
    is_valid: true,
    total_price_adjustment: totalPriceAdjustment
  };
}

// Telefunc to get modifier statistics
export async function onGetModifierStats(): Promise<ModifierStats> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const supabase = createSupabaseClient();

  const { data: modifiers, error } = await supabase
    .from('modifiers')
    .select(`
      is_active,
      is_required,
      type,
      modifier_options (id)
    `);

  if (error) throw error;

  const stats = modifiers?.reduce((acc, modifier) => {
    acc.total_modifiers++;
    
    if (modifier.is_active) {
      acc.active_modifiers++;
    } else {
      acc.inactive_modifiers++;
    }
    
    if (modifier.is_required) {
      acc.required_modifiers++;
    }
    
    switch (modifier.type) {
      case 'single_select':
        acc.single_select_count++;
        break;
      case 'multi_select':
        acc.multi_select_count++;
        break;
      case 'text_input':
        acc.text_input_count++;
        break;
      case 'number_input':
        acc.number_input_count++;
        break;
    }
    
    acc.total_options += modifier.modifier_options?.length || 0;
    
    return acc;
  }, {
    total_modifiers: 0,
    active_modifiers: 0,
    inactive_modifiers: 0,
    required_modifiers: 0,
    single_select_count: 0,
    multi_select_count: 0,
    text_input_count: 0,
    number_input_count: 0,
    total_options: 0
  }) || {
    total_modifiers: 0,
    active_modifiers: 0,
    inactive_modifiers: 0,
    required_modifiers: 0,
    single_select_count: 0,
    multi_select_count: 0,
    text_input_count: 0,
    number_input_count: 0,
    total_options: 0
  };

  return {
    ...stats,
    avg_options_per_modifier: stats.total_modifiers > 0 ? stats.total_options / stats.total_modifiers : 0
  };
}
