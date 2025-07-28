import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { onGetExpiringBatches } from '$lib/server/telefuncs/productBatch.telefunc';
import { onGetProducts } from '$lib/server/telefuncs/product.telefunc';
import type { Role } from '$lib/schemas/models';

const ALLOWED_ROLES: Role[] = ['admin', 'owner', 'manager', 'pharmacist'];

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	if (!ALLOWED_ROLES.includes(user.role as Role)) {
		throw redirect(302, '/reports');
	}

	// Call Telefunc functions directly
	const [nearExpiryBatches, productsData] = await Promise.all([
		onGetExpiringBatches(),
		onGetProducts()
	]);

	// Map the batch data to include product names
	const detailedNearExpiryProducts = nearExpiryBatches.map((batch) => {
		const product = productsData.products?.find((p) => p.id === batch.product_id);
		return {
			...batch,
			productName: product?.name ?? 'Unknown Product'
		};
	});

	return { nearExpiryProducts: detailedNearExpiryProducts };
};
