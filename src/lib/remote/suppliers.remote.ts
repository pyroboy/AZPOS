import { query, command, getRequestEvent } from '$app/server';
import { z } from 'zod';
import {
	supplierInputSchema,
	type Supplier,
	type SupplierInput
} from '$lib/types/supplier.schema';
import { createSupabaseClient } from '$lib/server/db';

// Helper to get authenticated user context (optional for read operations)
function getAuthenticatedUser(required = true) {
	const event = getRequestEvent();
	const user = event.locals.user;
	if (!user && required) throw new Error('Not authenticated');
	return user;
}

// Remote query to get all suppliers
export const getSuppliers = query(async (): Promise<Supplier[]> => {
	const user = getAuthenticatedUser(false); // Optional for read operations  
	console.log('🔍 [REMOTE] Fetching suppliers');

	const supabase = createSupabaseClient();

	const { data: suppliers, error } = await supabase
		.from('suppliers')
		.select('*')
		.eq('is_active', true)
		.order('name', { ascending: true });

	if (error) {
		console.error('❌ [REMOTE] Error fetching suppliers:', error);
		throw error;
	}

	console.log('✅ [REMOTE] Fetched', suppliers?.length || 0, 'suppliers');

	return (
		suppliers?.map((supplier) => ({
			id: supplier.id,
			name: supplier.name,
			code: supplier.code,
			email: supplier.email,
			phone: supplier.phone,
			website: supplier.website,
			tax_id: supplier.tax_id,
			payment_terms: supplier.payment_terms,
			credit_limit: supplier.credit_limit,
			currency: supplier.currency,
			notes: supplier.notes,
			is_active: supplier.is_active,
			created_at: supplier.created_at,
			updated_at: supplier.updated_at,
			created_by: supplier.created_by,
			updated_by: supplier.updated_by
		})) || []
	);
});

// Remote mutation to create a new supplier
export const createSupplier = command(
	supplierInputSchema,
	async (validatedData): Promise<Supplier> => {
		const user = getAuthenticatedUser();
		if (!user.permissions.includes('suppliers:write')) {
			throw new Error('Not authorized - insufficient permissions');
		}

		const supabase = createSupabaseClient();

		// Check if code already exists
		const { data: existingSupplier } = await supabase
			.from('suppliers')
			.select('id')
			.eq('code', validatedData.code)
			.single();

		if (existingSupplier) {
			throw new Error('Supplier with this code already exists');
		}

		const { data: newSupplier, error } = await supabase
			.from('suppliers')
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
			id: newSupplier.id,
			name: newSupplier.name,
			code: newSupplier.code,
			email: newSupplier.email,
			phone: newSupplier.phone,
			website: newSupplier.website,
			tax_id: newSupplier.tax_id,
			payment_terms: newSupplier.payment_terms,
			credit_limit: newSupplier.credit_limit,
			currency: newSupplier.currency,
			notes: newSupplier.notes,
			is_active: newSupplier.is_active,
			created_at: newSupplier.created_at,
			updated_at: newSupplier.updated_at,
			created_by: newSupplier.created_by,
			updated_by: newSupplier.updated_by
		};
	}
);