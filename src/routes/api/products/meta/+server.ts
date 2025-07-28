import { json } from '@sveltejs/kit';
import { parseProducts } from '$lib/utils/productParser.js';
import type { Product } from '$lib/schemas/models';
export async function GET() {
	const all = await parseProducts(); // uses in-memory cache

	// cast because CSV has a `stock` column not in schema
	const withStock = all as (Product & { stock: number })[];

	return json({
		totalProducts: withStock.length,
		totalInventoryValue: withStock.reduce((s, p) => s + (p.average_cost || 0) * p.stock, 0),
		potentialRevenue: withStock.reduce((s, p) => s + (p.price || 0) * p.stock, 0),
		lowStockCount: withStock.filter((p) => p.stock < (p.reorder_point ?? 20)).length,
		outOfStockCount: withStock.filter((p) => p.stock === 0).length
	});
}
