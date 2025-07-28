import { onCreateUser, onUpdateUser } from '$lib/server/telefuncs/user.telefunc';
import type { Actions } from './$types';
import type { UserInput } from '$lib/types/user.schema';
import { fail } from '@sveltejs/kit';

export const actions: Actions = {
	addUser: async ({ request }: { request: Request }) => {
		const data = await request.formData();
		const fullName = data.get('fullName') as string;
		const role = data.get('role') as string;
		const password = data.get('pin') as string;
		const email = data.get('email') as string;

		if (!fullName || !email || !role || !password) {
			return fail(400, { success: false, message: 'Missing required fields.' });
		}

		try {
			const userData: UserInput = {
				full_name: fullName,
				email,
				role: role as 'admin' | 'manager' | 'cashier' | 'customer',
				password,
				is_active: true
			};

			await onCreateUser(userData);
			return { success: true, message: 'User created successfully.' };
		} catch (error) {
			console.error('Failed to create user:', error);
			return fail(500, { success: false, message: 'Failed to create user.' });
		}
	},
	deactivateUser: async ({ request }: { request: Request }) => {
		const data = await request.formData();
		const userId = data.get('userId') as string;

		if (!userId) {
			return fail(400, { success: false, message: 'User ID not provided.' });
		}

		try {
			await onUpdateUser(userId, { is_active: false });
			return { success: true, message: 'User deactivated.' };
		} catch (error) {
			console.error('Failed to deactivate user:', error);
			return fail(500, { success: false, message: 'Failed to deactivate user.' });
		}
	}
};
