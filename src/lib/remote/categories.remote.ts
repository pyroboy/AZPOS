import { query, command, getRequestEvent } from '$app/server';
import { z } from 'zod';
import {
	categoryInputSchema,
	type Category,
	type CategoryInput
} from '$lib/types/category.schema';
import { createSupabaseClient } from '$lib/server/db';

// Helper to get authenticated user context (optional for read operations)
function getAuthenticatedUser(required = true) {
	const event = getRequestEvent();
	const user = event.locals.user;
	if (!user && required) throw new Error('Not authenticated');
	return user;
}

// Remote query to get all categories
export const getCategories = query(async (): Promise<Category[]> => {
	const user = getAuthenticatedUser(false); // Optional for read operations
	console.log('🔍 [REMOTE] Fetching categories');

	const supabase = createSupabaseClient();

	const { data: categories, error } = await supabase
		.from('categories')
		.select('*')
		.eq('is_active', true)
		.order('sort_order', { ascending: true })
		.order('name', { ascending: true });

	if (error) {
		console.error('❌ [REMOTE] Error fetching categories:', error);
		throw error;
	}

	console.log('✅ [REMOTE] Fetched', categories?.length || 0, 'categories');

	return (
		categories?.map((category) => ({
			id: category.id,
			name: category.name,
			description: category.description,
			parent_id: category.parent_id,
			slug: category.slug,
			image_url: category.image_url,
			is_active: category.is_active,
			sort_order: category.sort_order,
			level: category.level,
			path: category.path,
			product_count: category.product_count,
			meta_title: category.meta_title,
			meta_description: category.meta_description,
			tags: category.tags,
			created_at: category.created_at,
			updated_at: category.updated_at,
			created_by: category.created_by,
			updated_by: category.updated_by
		})) || []
	);
});

// Remote mutation to create a new category
export const createCategory = command(
	categoryInputSchema,
	async (validatedData): Promise<Category> => {
		const user = getAuthenticatedUser();
		if (!user.permissions.includes('categories:write')) {
			throw new Error('Not authorized - insufficient permissions');
		}

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

		const { data: newCategory, error } = await supabase
			.from('categories')
			.insert({
				...validatedData,
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
			level: newCategory.level,
			path: newCategory.path,
			product_count: newCategory.product_count,
			meta_title: newCategory.meta_title,
			meta_description: newCategory.meta_description,
			tags: newCategory.tags,
			created_at: newCategory.created_at,
			updated_at: newCategory.updated_at,
			created_by: newCategory.created_by,
			updated_by: newCategory.updated_by
		};
	}
);