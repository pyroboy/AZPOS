import { onGetProducts } from '$lib/server/telefuncs/product.telefunc';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Load all products on the server side for initial render
	const productsData = await onGetProducts();

	// Filter for active products
	const activeProducts = productsData.products?.filter((product) => product.is_active) || [];

	return {
		products: {
			...productsData,
			products: activeProducts
		}
	};
};
