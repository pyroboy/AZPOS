import type { ServerLoad } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

export const load: ServerLoad = async ({ parent }: { parent: () => Promise<{ user?: { role: string } }> }) => {
	// Redirect if user is not authenticated or authorized
	const { user } = await parent();
	if (!user || !['admin', 'owner', 'manager'].includes(user.role)) {
		throw redirect(302, '/reports');
	}

	// For now, return empty data - this would normally fetch profit margin data
	return {
		salesWithProfit: [],
		totalRevenue: 0,
		totalCogs: 0,
		totalProfit: 0,
		averageMargin: 0
	};
};
