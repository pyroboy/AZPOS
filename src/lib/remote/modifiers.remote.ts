import { query, command, getRequestEvent } from '$app/server';
import { z } from 'zod';
import { createSupabaseClient, getAuthenticatedUser } from '$lib/server/db';

// Modifier schemas
const createModifierSchema = z.object({
	name: z.string().min(1),
	description: z.string().optional(),
	type: z.enum(['option', 'addon', 'substitute']),
	price_adjustment: z.number(),
	product_id: z.string().optional(),
	category_id: z.string().optional(),
	is_required: z.boolean().default(false),
	max_selections: z.number().default(1),
	options: z.array(z.object({
		name: z.string(),
		price_adjustment: z.number(),
		is_default: z.boolean().default(false)
	})).optional().default([])
});

const updateModifierSchema = createModifierSchema.partial().extend({
	id: z.string()
});

// Get all modifiers
export const getModifiers = query(
	z.object({
		product_id: z.string().optional(),
		category_id: z.string().optional(),
		is_active: z.boolean().optional().default(true)
	}).optional(),
	async (filters = {}): Promise<any[]> => {
		const user = getAuthenticatedUser();
		console.log('🔧 [REMOTE] Fetching modifiers');
		
		const supabase = createSupabaseClient();
		
		let query = supabase
			.from('modifiers')
			.select(`
				*,
				modifier_options(*)
			`)
			.order('name', { ascending: true });
		
		if (filters.product_id) {
			query = query.eq('product_id', filters.product_id);
		}
		
		if (filters.category_id) {
			query = query.eq('category_id', filters.category_id);
		}
		
		if (filters.is_active !== undefined) {
			query = query.eq('is_active', filters.is_active);
		}
		
		const { data, error } = await query;
		
		if (error) {
			console.error('❌ [REMOTE] Modifiers fetch error:', error);
			throw error;
		}
		
		console.log('✅ [REMOTE] Fetched', data?.length || 0, 'modifiers');
		return data || [];
	}
);

// Get modifier by ID
export const getModifier = query(
	z.object({ id: z.string() }),
	async ({ id }): Promise<any | null> => {
		const user = getAuthenticatedUser();
		console.log('🔧 [REMOTE] Fetching modifier:', id);
		
		const supabase = createSupabaseClient();
		
		const { data, error } = await supabase
			.from('modifiers')
			.select(`
				*,
				modifier_options(*)
			`)
			.eq('id', id)
			.single();
		
		if (error) {
			console.error('❌ [REMOTE] Modifier fetch error:', error);
			throw error;
		}
		
		console.log('✅ [REMOTE] Modifier fetched');
		return data;
	}
);

// Create modifier
export const createModifier = command(
	createModifierSchema,
	async (modifierData): Promise<any> => {
		const user = getAuthenticatedUser();
		if (!user.permissions.includes('modifiers:write')) {
			throw new Error('Not authorized to create modifiers');
		}
		
		console.log('🔧 [REMOTE] Creating modifier:', modifierData.name);
		
		const supabase = createSupabaseClient();
		
		// Create modifier
		const { data: modifier, error: modifierError } = await supabase
			.from('modifiers')
			.insert({
				name: modifierData.name,
				description: modifierData.description,
				type: modifierData.type,
				price_adjustment: modifierData.price_adjustment,
				product_id: modifierData.product_id,
				category_id: modifierData.category_id,
				is_required: modifierData.is_required,
				max_selections: modifierData.max_selections,
				is_active: true,
				created_by: user.id,
				updated_by: user.id,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			})
			.select()
			.single();
		
		if (modifierError) {
			console.error('❌ [REMOTE] Modifier creation error:', modifierError);
			throw modifierError;
		}
		
		// Create modifier options if any
		if (modifierData.options && modifierData.options.length > 0) {
			const options = modifierData.options.map(option => ({
				modifier_id: modifier.id,
				name: option.name,
				price_adjustment: option.price_adjustment,
				is_default: option.is_default,
				created_at: new Date().toISOString()
			}));
			
			const { error: optionsError } = await supabase
				.from('modifier_options')
				.insert(options);
			
			if (optionsError) {
				console.error('❌ [REMOTE] Modifier options creation error:', optionsError);
				throw optionsError;
			}
		}
		
		console.log('✅ [REMOTE] Modifier created:', modifier.id);
		return modifier;
	}
);

// Update modifier
export const updateModifier = command(
	updateModifierSchema,
	async (modifierData): Promise<any> => {
		const user = getAuthenticatedUser();
		if (!user.permissions.includes('modifiers:write')) {
			throw new Error('Not authorized to update modifiers');
		}
		
		console.log('🔧 [REMOTE] Updating modifier:', modifierData.id);
		
		const supabase = createSupabaseClient();
		
		const { id, options, ...updateData } = modifierData;
		
		// Update modifier
		const { data: modifier, error: modifierError } = await supabase
			.from('modifiers')
			.update({
				...updateData,
				updated_by: user.id,
				updated_at: new Date().toISOString()
			})
			.eq('id', id)
			.select()
			.single();
		
		if (modifierError) {
			console.error('❌ [REMOTE] Modifier update error:', modifierError);
			throw modifierError;
		}
		
		// Update options if provided
		if (options) {
			// Delete existing options
			await supabase
				.from('modifier_options')
				.delete()
				.eq('modifier_id', id);
			
			// Insert new options
			if (options.length > 0) {
				const newOptions = options.map(option => ({
					modifier_id: id,
					name: option.name,
					price_adjustment: option.price_adjustment,
					is_default: option.is_default,
					created_at: new Date().toISOString()
				}));
				
				const { error: optionsError } = await supabase
					.from('modifier_options')
					.insert(newOptions);
				
				if (optionsError) {
					console.error('❌ [REMOTE] Modifier options update error:', optionsError);
					throw optionsError;
				}
			}
		}
		
		console.log('✅ [REMOTE] Modifier updated');
		return modifier;
	}
);

// Delete modifier
export const deleteModifier = command(
	z.object({ id: z.string() }),
	async ({ id }): Promise<void> => {
		const user = getAuthenticatedUser();
		if (!user.permissions.includes('modifiers:write')) {
			throw new Error('Not authorized to delete modifiers');
		}
		
		console.log('🔧 [REMOTE] Deleting modifier:', id);
		
		const supabase = createSupabaseClient();
		
		// Soft delete - set is_active to false
		const { error } = await supabase
			.from('modifiers')
			.update({
				is_active: false,
				updated_by: user.id,
				updated_at: new Date().toISOString()
			})
			.eq('id', id);
		
		if (error) {
			console.error('❌ [REMOTE] Modifier deletion error:', error);
			throw error;
		}
		
		console.log('✅ [REMOTE] Modifier deleted');
	}
);