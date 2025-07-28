import { onGetTransactions } from '$lib/server/telefuncs/transaction.telefunc';
import { onGetProducts } from '$lib/server/telefuncs/product.telefunc';
import { onGetProductBatches } from '$lib/server/telefuncs/productBatch.telefunc';
import type { Product } from '$lib/types/product.schema';
import type { Transaction, TransactionItem } from '$lib/types/transaction.schema';
import type { Role } from '$lib/schemas/models';
import { redirect } from '@sveltejs/kit';

const ALLOWED_ROLES: Role[] = ['admin', 'owner', 'manager'];

/** @type {import('./$types').PageServerLoad} */
export async function load({ parent }) {
	const { user } = await parent();

	if (!ALLOWED_ROLES.includes(user.role as Role)) {
		throw redirect(302, '/reports');
	}

	const { transactions } = await onGetTransactions();
	const { products } = await onGetProducts();
	const productBatches = await onGetProductBatches();

	const productMap = new Map<string, Product>(products.map((p: Product) => [p.id, p]));

	const salesStats: Record<string, { last_sale_date: string; units_sold: number }> = {};

	// Sort transactions to find the most recent sale date accurately
	transactions
		.filter((t: Transaction) => t.status === 'completed' && t.items)
		.sort(
			(a: Transaction, b: Transaction) =>
				new Date(b.processed_at).getTime() - new Date(a.processed_at).getTime()
		)
		.forEach((t: Transaction) => {
			t.items.forEach((item: TransactionItem) => {
				if (!salesStats[item.product_id]) {
					salesStats[item.product_id] = {
						last_sale_date: t.processed_at,
						units_sold: 0
					};
				}
			});
		});

	// Calculate total units sold in the last 30 days for fast-movers
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	transactions
		.filter(
			(t: Transaction) => t.status === 'completed' && new Date(t.processed_at) >= thirtyDaysAgo
		)
		.forEach((t: Transaction) => {
			t.items.forEach((item: TransactionItem) => {
				if (salesStats[item.product_id]) {
					salesStats[item.product_id].units_sold += item.quantity;
				}
			});
		});

	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

	const thirtyDaysAgoForSlow = new Date();
	thirtyDaysAgoForSlow.setDate(thirtyDaysAgoForSlow.getDate() - 30);

	const fastMovers = Object.entries(salesStats)
		.filter(([, stats]) => new Date(stats.last_sale_date) >= sevenDaysAgo)
		.map(([product_id, stats]) => {
			const product = productMap.get(product_id);
			const stock = productBatches.batches
				.filter((b) => b.product_id === product_id)
				.reduce((sum, b) => sum + b.quantity_on_hand, 0);
			return {
				product_id,
				sku: product?.sku ?? 'N/A',
				name: product?.name ?? 'Unknown',
				units_sold: stats.units_sold,
				last_sale_date: stats.last_sale_date,
				currentStock: stock
			};
		})
		.sort((a, b) => b.units_sold - a.units_sold);

	const slowMovers = products
		.map((product) => {
			const stock = productBatches.batches
				.filter((b) => b.product_id === product.id)
				.reduce((sum, b) => sum + b.quantity_on_hand, 0);
			return {
				product,
				stock,
				stats: salesStats[product.id]
			};
		})
		.filter(({ stock, stats }) => {
			const last_sale_date = stats ? new Date(stats.last_sale_date) : null;
			return stock > 0 && (!last_sale_date || last_sale_date < thirtyDaysAgoForSlow);
		})
		.map(({ product, stats, stock }) => ({
			product_id: product.id,
			sku: product.sku,
			name: product.name,
			currentStock: stock,
			last_sale_date: stats?.last_sale_date ?? null
		}))
		.sort(
			(a, b) =>
				new Date(a.last_sale_date ?? 0).getTime() - new Date(b.last_sale_date ?? 0).getTime()
		);

	return {
		fastMovers,
		slowMovers
	};
}
