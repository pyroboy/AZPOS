import { users } from '$lib/stores/userStore';
import type { Actions } from './$types';
import type { Role } from '$lib/schemas/models';

export const actions: Actions = {
	addUser: async ({ request }: { request: Request }) => {
		const data = await request.formData();
        const fullName = data.get('fullName') as string;
        const username = data.get('username') as string;
        const role = data.get('role') as Role;
        const pin = data.get('pin') as string;

        if (fullName && username && role && pin) {
            users.addUser(fullName, username, role, pin);
            return { success: true, message: 'User created successfully.' };
        }

        return { success: false, message: 'Missing required fields.' };
	},
	deactivateUser: async ({ request }: { request: Request }) => {
        const data = await request.formData();
        const userId = data.get('userId') as string;

        if (userId) {
            users.deactivateUser(userId);
            return { success: true, message: 'User deactivated.' };
        }

        return { success: false, message: 'User ID not provided.' };
	}
};
