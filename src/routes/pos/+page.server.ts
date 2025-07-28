import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// For now, return empty products array or fetch from your preferred source
	return { products: [] };
};
