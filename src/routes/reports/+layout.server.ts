import type { LayoutServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import type { Role } from '$lib/schemas/models';

// Defines which reports each role can access by their URL slug.
const ROLE_REPORTS: Record<Role, string[]> = {
	admin: [
		'sales',
		'audit-trail',
		'expiration',
		'inventory-velocity',
		'profit-margin',
		'supplier-performance'
	],
	owner: [
		'sales',
		'audit-trail',
		'expiration',
		'inventory-velocity',
		'profit-margin',
		'supplier-performance'
	],
	manager: ['sales', 'audit-trail', 'expiration', 'inventory-velocity', 'supplier-performance'],
	pharmacist: ['expiration', 'audit-trail'],
	cashier: [],
	customer: []
};

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const allowed = ROLE_REPORTS[locals.user.role as Role] ?? [];

	// If a user has no reports, send them back to the homepage.
	if (allowed.length === 0) {
		throw redirect(302, '/');
	}

	// await products.loadProducts(fetch); // This uses the new loadProductsCached method

	return {
		allowedReports: allowed,
		user: locals.user
		// products: get(products)
	};
};
