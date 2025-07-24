import type { User, Role } from '$lib/schemas/models';

const initialUsers: User[] = [
	{
		id: 'c2a7e3e0-12d3-4b8e-a9a7-3f8b5b6b1f2a',
		full_name: 'Admin User',
		username: 'admin',
		role: 'admin',
		pin_hash: '1234',
		is_active: true,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	},
	{
		id: 'd3b8f4e1-23e4-5c9f-b0b8-4g9c6c7c2g3b',
		full_name: 'Business Owner',
		username: 'owner',
		role: 'owner',
		pin_hash: '1234',
		is_active: true,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	},
	{
		id: 'e4c9g5f2-34f5-6d0g-c1c9-5h0d7d8d3h4c',
		full_name: 'Pharmacy Manager',
		username: 'manager',
		role: 'manager',
		pin_hash: '1234',
		is_active: true,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	},
	{
		id: 'f5d0h6g3-45g6-7e1h-d2d0-6i1e8e9e4i5d',
		full_name: 'Staff Pharmacist',
		username: 'pharmacist',
		role: 'pharmacist',
		pin_hash: '1234',
		is_active: true,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	},
	{
		id: 'g6e1i7h4-56h7-8f2i-e3e1-7j2f9f0f5j6e',
		full_name: 'Cashier User',
		username: 'cashier',
		role: 'cashier',
		pin_hash: '1234',
		is_active: true,
		created_at: new Date().toISOString(),
		updated_at: new Date().toISOString()
	}
];

import { writable, get } from 'svelte/store';

function createUserStore() {
	const { subscribe, update } = writable<User[]>(initialUsers);

	return {
		subscribe,
		deactivateUser: (userId: string) => {
			update((users) =>
				users.map((user) =>
					user.id === userId ? { ...user, is_active: false, updated_at: new Date().toISOString() } : user
				)
			);
		},
		getAllActiveUsers: (): User[] => {
			return get({ subscribe }).filter((u) => u.is_active);
		},
		findByUsername: (username: string): User | undefined => {
			if (!username) return undefined;
			return get({ subscribe }).find(
				(u) => u.username.toLowerCase() === username.toLowerCase() && u.is_active
			);
		},
		findById: (userId: string): User | undefined => {
			return get({ subscribe }).find((u) => u.id === userId);
		},
		addUser: (fullName: string, username: string, role: Role, pin: string) => {
			const newUser: User = {
				id: `user-${crypto.randomUUID()}`,
				full_name: fullName,
				username,
				role,
				pin_hash: pin, // In a real app, this would be hashed
				is_active: true,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			};
			update((users) => [...users, newUser]);
		}
	};
}

export const users = createUserStore();

