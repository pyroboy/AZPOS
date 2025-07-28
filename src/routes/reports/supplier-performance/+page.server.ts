import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import type { Role } from '$lib/schemas/models';

const ALLOWED_ROLES: Role[] = ['admin', 'owner', 'manager'];

export const load: PageServerLoad = async ({ parent }) => {
	const { user } = await parent();
	if (!ALLOWED_ROLES.includes(user.role as any)) {
		throw redirect(302, '/reports');
	}
};
