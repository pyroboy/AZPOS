import type { Role } from '$lib/schemas/models';
import {
	LayoutDashboard,
	Users,
	Box,
	Settings,
	ShoppingCart,
	FileText,
	Percent
} from 'lucide-svelte';

export interface NavLink {
	href: string;
	label: string;
	icon: typeof LayoutDashboard; // Using one icon as a type template
	roles: Role[];
}

export const navLinks: NavLink[] = [
	{
		href: '/dashboard',
		label: 'Dashboard',
		icon: LayoutDashboard,
		roles: ['admin', 'owner', 'manager', 'pharmacist']
	},
	{
		href: '/pos',
		label: 'POS',
		icon: ShoppingCart,
		roles: ['admin', 'owner', 'manager', 'pharmacist', 'cashier']
	},
	{
		href: '/inventory',
		label: 'Inventory',
		icon: Box,
		roles: ['admin', 'owner', 'manager', 'pharmacist']
	},
	{
		href: '/reports',
		label: 'Reports',
		icon: FileText,
		roles: ['admin', 'owner', 'manager', 'pharmacist']
	},
	{
		href: '/admin/users',
		label: 'User Management',
		icon: Users,
		roles: ['admin', 'owner']
	},
	{
		href: '/admin/discounts',
		label: 'Discounts',
		icon: Percent,
		roles: ['admin', 'owner']
	},
	{
		href: '/admin/settings',
		label: 'Settings',
		icon: Settings,
		roles: ['admin', 'owner']
	}
];
