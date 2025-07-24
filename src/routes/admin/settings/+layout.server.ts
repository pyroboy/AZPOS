import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	if (locals.user?.role !== 'admin') {
		redirect(307, '/');
	}
};
