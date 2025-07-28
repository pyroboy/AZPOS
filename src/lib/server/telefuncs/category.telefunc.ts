/* eslint-disable @typescript-eslint/no-explicit-any */
import { getContext } from 'telefunc';
import { 
  categoryInputSchema,
  categoryFiltersSchema,
  moveCategorySchema,
  type Category,
  type CategoryTree,
  type CategoryFilters,
  type CategoryStats,
} from '$lib/types/category.schema';
import { createSupabaseClient } from '$lib/server/db';

// Telefunc to get categories with filters
export async function onGetCategories(filters?: CategoryFilters): Promise<Category[]> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const supabase = createSupabaseClient();
  const validatedFilters = filters ? categoryFiltersSchema.parse(filters) : {};

  let query = supabase
    .from('categories')
    .select(`
      *,
      product_count:products(count)
    `);

  // Apply filters
  if (validatedFilters.search) {
    query = query.or(`name.ilike.%${validatedFilters.search}%,description.ilike.%${validatedFilters.search}%`);
  }
  
  if (validatedFilters.parent_id !== undefined) {
    if (validatedFilters.parent_id === null) {
      query = query.is('parent_id', null);
    } else {
      query = query.eq('parent_id', validatedFilters.parent_id);
    }
  }
  
  if (validatedFilters.is_active !== undefined) {
    query = query.eq('is_active', validatedFilters.is_active);
  }
  
  if (validatedFilters.level !== undefined) {
    query = query.eq('level', validatedFilters.level);
  }
  
  if (validatedFilters.has_products) {
    query = query.gt('product_count', 0);
  }

  // Apply sorting
  const sortBy = validatedFilters.sort_by || 'sort_order';
  const sortOrder = validatedFilters.sort_order || 'asc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  const { data: categories, error } = await query;
  if (error) throw error;

  return categories?.map(category => ({
    id: category.id,
    name: category.name,
    description: category.description,
    parent_id: category.parent_id,
    slug: category.slug,
    image_url: category.image_url,
    is_active: category.is_active,
    sort_order: category.sort_order,
    meta_title: category.meta_title,
    meta_description: category.meta_description,
    tags: category.tags,
    level: category.level,
    path: category.path,
    product_count: category.product_count || 0,
    created_at: category.created_at,
    updated_at: category.updated_at,
    created_by: category.created_by,
    updated_by: category.updated_by
  })) || [];
}

// Telefunc to get category tree structure
export async function onGetCategoryTree(): Promise<CategoryTree[]> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const supabase = createSupabaseClient();

  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, description, color, icon, level, parent_id, product_count, is_active, sort_order')
    .eq('is_active', true)
    .order('level')
    .order('sort_order');

  if (error) throw error;

  // Build tree structure
  const categoryMap = new Map();
  const rootCategories: CategoryTree[] = [];

  // First pass: create all category objects
  categories?.forEach(cat => {
    const category: CategoryTree = {
      id: cat.id,
      name: cat.name,
      description: cat.description,
      color: cat.color,
      icon: cat.icon,
      is_active: cat.is_active,
      children: []
    };
    categoryMap.set(cat.id, category);
  });

  // Second pass: build hierarchy
  categories?.forEach(cat => {
    const category = categoryMap.get(cat.id);
    if (cat.parent_id) {
      const parent = categoryMap.get(cat.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(category);
      }
    } else {
      rootCategories.push(category);
    }
  });

  return rootCategories;
}

// Telefunc to create a new category
export async function onCreateCategory(categoryData: unknown): Promise<Category> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const validatedData = categoryInputSchema.parse(categoryData);
  const supabase = createSupabaseClient();

  // Check if slug already exists
  const { data: existingCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', validatedData.slug)
    .single();

  if (existingCategory) {
    throw new Error('Category with this slug already exists');
  }

  // Calculate level and path
  let level = 0;
  let path = validatedData.slug;
  
  if (validatedData.parent_id) {
    const { data: parent } = await supabase
      .from('categories')
      .select('level, path')
      .eq('id', validatedData.parent_id)
      .single();
    
    if (parent) {
      level = parent.level + 1;
      path = `${parent.path}/${validatedData.slug}`;
    }
  }

  const { data: newCategory, error } = await supabase
    .from('categories')
    .insert({
      ...validatedData,
      level,
      path,
      created_by: user.id,
      updated_by: user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: newCategory.id,
    name: newCategory.name,
    description: newCategory.description,
    parent_id: newCategory.parent_id,
    slug: newCategory.slug,
    image_url: newCategory.image_url,
    is_active: newCategory.is_active,
    sort_order: newCategory.sort_order,
    meta_title: newCategory.meta_title,
    meta_description: newCategory.meta_description,
    tags: newCategory.tags,
    level: newCategory.level,
    path: newCategory.path,
    product_count: 0,
    created_at: newCategory.created_at,
    updated_at: newCategory.updated_at,
    created_by: newCategory.created_by,
    updated_by: newCategory.updated_by
  };
}

// Telefunc to update a category
export async function onUpdateCategory(categoryId: string, categoryData: unknown): Promise<Category> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const validatedData = categoryInputSchema.partial().parse(categoryData);
  const supabase = createSupabaseClient();

  // Check if slug already exists (if being updated)
  if (validatedData.slug) {
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', validatedData.slug)
      .neq('id', categoryId)
      .single();

    if (existingCategory) {
      throw new Error('Category with this slug already exists');
    }
  }

  const { data: updatedCategory, error } = await supabase
    .from('categories')
    .update({
      ...validatedData,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', categoryId)
    .select()
    .single();

  if (error) throw error;

  return {
    id: updatedCategory.id,
    name: updatedCategory.name,
    description: updatedCategory.description,
    parent_id: updatedCategory.parent_id,
    slug: updatedCategory.slug,
    image_url: updatedCategory.image_url,
    is_active: updatedCategory.is_active,
    sort_order: updatedCategory.sort_order,
    meta_title: updatedCategory.meta_title,
    meta_description: updatedCategory.meta_description,
    tags: updatedCategory.tags,
    level: updatedCategory.level,
    path: updatedCategory.path,
    product_count: updatedCategory.product_count || 0,
    created_at: updatedCategory.created_at,
    updated_at: updatedCategory.updated_at,
    created_by: updatedCategory.created_by,
    updated_by: updatedCategory.updated_by
  };
}

// Telefunc to get category statistics
export async function onGetCategoryStats(): Promise<CategoryStats> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const supabase = createSupabaseClient();

  const { data: categories, error } = await supabase
    .from('categories')
    .select('is_active, level, product_count');

  if (error) throw error;

  const stats = categories?.reduce((acc, category) => {
    acc.total_categories++;
    if (category.is_active) acc.active_categories++;
    else acc.inactive_categories++;
    if (category.level === 0) acc.root_categories++;
    if (category.product_count > 0) acc.categories_with_products++;
    
    acc.max_depth = Math.max(acc.max_depth, category.level);
    acc.total_products += category.product_count;
    
    return acc;
  }, {
    total_categories: 0,
    active_categories: 0,
    inactive_categories: 0,
    root_categories: 0,
    categories_with_products: 0,
    max_depth: 0,
    total_products: 0
  }) || {
    total_categories: 0,
    active_categories: 0,
    inactive_categories: 0,
    root_categories: 0,
    categories_with_products: 0,
    max_depth: 0,
    total_products: 0
  };

  return {
    ...stats,
    avg_products_per_category: stats.total_categories > 0 ? stats.total_products / stats.total_categories : 0
  };
}

// Telefunc to move category
export async function onMoveCategory(moveData: unknown): Promise<Category> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const validatedData = moveCategorySchema.parse(moveData);
  const supabase = createSupabaseClient();

  // Prevent circular references
  if (validatedData.new_parent_id === validatedData.category_id) {
    throw new Error('Category cannot be its own parent');
  }

  // Update category
  const updatePayload: any = {
    parent_id: validatedData.new_parent_id,
    updated_by: user.id,
    updated_at: new Date().toISOString()
  };

  if (validatedData.new_sort_order !== undefined) {
    updatePayload.sort_order = validatedData.new_sort_order;
  }

  const { data: updatedCategory, error } = await supabase
    .from('categories')
    .update(updatePayload)
    .eq('id', validatedData.category_id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: updatedCategory.id,
    name: updatedCategory.name,
    description: updatedCategory.description,
    parent_id: updatedCategory.parent_id,
    slug: updatedCategory.slug,
    image_url: updatedCategory.image_url,
    is_active: updatedCategory.is_active,
    sort_order: updatedCategory.sort_order,
    meta_title: updatedCategory.meta_title,
    meta_description: updatedCategory.meta_description,
    tags: updatedCategory.tags,
    level: updatedCategory.level,
    path: updatedCategory.path,
    product_count: updatedCategory.product_count || 0,
    created_at: updatedCategory.created_at,
    updated_at: updatedCategory.updated_at,
    created_by: updatedCategory.created_by,
    updated_by: updatedCategory.updated_by
  };
}
