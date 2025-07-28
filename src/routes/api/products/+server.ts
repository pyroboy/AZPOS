import { json } from '@sveltejs/kit';
import { parseProducts } from '$lib/utils/productParser';

export async function GET({ url }) {
	const allProducts = await parseProducts();

	const page = parseInt(url.searchParams.get('page') || '1', 10);
	const limit = parseInt(url.searchParams.get('limit') || '50', 10);
	const startIndex = (page - 1) * limit;
	const endIndex = page * limit;

	const paginatedProducts = allProducts.slice(startIndex, endIndex);

	return json({
		products: paginatedProducts,
		page,
		limit,
		total: allProducts.length
	});
}
