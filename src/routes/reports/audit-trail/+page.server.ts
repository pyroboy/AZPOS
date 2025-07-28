import { redirect } from '@sveltejs/kit';
import type { Role } from '$lib/schemas/models';
import type { PageServerLoad } from './$types';
import { onGetStockTransactions } from '$lib/server/telefuncs/stockTransaction.telefunc';
import { onGetProducts } from '$lib/server/telefuncs/product.telefunc';
import { onGetUsers } from '$lib/server/telefuncs/user.telefunc';
import type { StockTransaction } from '$lib/types/stockTransaction.schema';

export type DetailedAdjustment = StockTransaction & {
	productName: string;
	userName: string;
};

const ALLOWED_ROLES: Role[] = ['admin', 'owner', 'manager', 'pharmacist'];

export const load: PageServerLoad = async ({ parent }) => {
	// Redirect if user is not authenticated
	const { user } = await parent();
	if (!ALLOWED_ROLES.includes(user.role)) {
		throw redirect(302, '/reports');
	}

	// Fetch data using Telefunc functions instead of store methods
	try {
		const [stockTransactions, products, users] = await Promise.all([
			onGetStockTransactions(),
			onGetProducts({ is_active: true }),
			onGetUsers({ is_active: true })
		]);

		// Transform stock transactions into detailed adjustments
		const detailedAdjustments: DetailedAdjustment[] = stockTransactions.transactions
			.map((transaction) => {
				const product = products.products?.find((p) => p.id === transaction.product_id);
				const processedByUser = users.users?.find((u) => u.id === transaction.created_by);
				return {
					...transaction,
					productName: product?.name ?? 'Unknown Product',
					userName: processedByUser?.full_name ?? 'System'
				};
			})
			.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

		return { transactions: detailedAdjustments };
	} catch (error) {
		console.error('Error fetching audit trail data:', error);
		throw new Error('Failed to load audit trail data');
	}
};
