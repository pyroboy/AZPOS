import type { User, Role } from '$lib/schemas/models';
import {
    SvelteDate,
  } from 'svelte/reactivity';

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

// Use $state rune instead of writable store
export const users = $state<User[]>(initialUsers);

// Derived state for active users
export const activeUsers = $derived(users.filter(u => u.is_active));

// Export functions that directly mutate the state
export function deactivateUser(userId: string) {
	const userIndex = users.findIndex(user => user.id === userId);
	if (userIndex !== -1) {
		users[userIndex] = {
			...users[userIndex],
			is_active: false,
			updated_at: new SvelteDate().toISOString()
		};
	}
}

export function getAllActiveUsers(): User[] {
	return users.filter(u => u.is_active);
}

export function findByUsername(username: string): User | undefined {
	if (!username) return undefined;
	return users.find(
		u => u.username.toLowerCase() === username.toLowerCase() && u.is_active
	);
}

export function findById(userId: string): User | undefined {
	return users.find(u => u.id === userId);
}

export function addUser(fullName: string, username: string, role: Role, pin: string) {
	const newUser: User = {
		id: `user-${crypto.randomUUID()}`,
		full_name: fullName,
		username,
		role,
		pin_hash: pin, // In a real app, this would be hashed
		is_active: true,
		created_at: new SvelteDate().toISOString(),
		updated_at: new SvelteDate().toISOString()
	};
	users.push(newUser);
}
