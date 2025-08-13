import { query, command, getRequestEvent } from '$app/server';
import { z } from 'zod';
import { createSupabaseClient, getAuthenticatedUser } from '$lib/server/db';

// Auth schemas
const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6)
});

const registerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(6),
	full_name: z.string().min(1),
	role: z.enum(['admin', 'owner', 'manager', 'pharmacist', 'cashier']).default('pharmacist')
});

const updateProfileSchema = z.object({
	full_name: z.string().min(1).optional(),
	email: z.string().email().optional(),
	phone: z.string().optional()
});

const changePasswordSchema = z.object({
	current_password: z.string().min(6),
	new_password: z.string().min(6)
});

const pinLoginSchema = z.object({
	pin: z.string().length(4)
});

// Get current authenticated user
export const getCurrentUser = query(async (): Promise<any | null> => {
	console.log('🔐 [REMOTE] Getting current user');
	
	try {
		const user = getAuthenticatedUser();
		console.log('✅ [REMOTE] Current user found:', user.email);
		return user;
	} catch (error) {
		console.log('ℹ️ [REMOTE] No authenticated user');
		return null;
	}
});

// Login with email and password
export const login = command(
	loginSchema,
	async (credentials): Promise<any> => {
		console.log('🔐 [REMOTE] Attempting login for:', credentials.email);
		
		const supabase = createSupabaseClient();
		
		// Attempt to sign in with Supabase Auth
		const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
			email: credentials.email,
			password: credentials.password
		});
		
		if (authError || !authData.user) {
			console.error('❌ [REMOTE] Login failed:', authError?.message);
			throw new Error(authError?.message || 'Login failed');
		}
		
		// Get user profile
		const { data: profile, error: profileError } = await supabase
			.from('users')
			.select('*')
			.eq('id', authData.user.id)
			.single();
		
		if (profileError) {
			console.error('❌ [REMOTE] Profile fetch error:', profileError);
			throw new Error('Failed to fetch user profile');
		}
		
		const user = {
			id: authData.user.id,
			email: authData.user.email,
			full_name: profile?.full_name || authData.user.email?.split('@')[0],
			role: profile?.role || 'pharmacist',
			is_active: profile?.is_active ?? true,
			is_verified: authData.user.email_confirmed_at !== null,
			permissions: profile?.permissions || ['pos:operate', 'reports:view'],
			created_at: authData.user.created_at,
			updated_at: authData.user.updated_at
		};
		
		// Set session cookies
		const event = getRequestEvent();
		event.cookies.set('session_user', user.email, { 
			path: '/', 
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});
		event.cookies.set('session_token', authData.session?.access_token || '', { 
			path: '/', 
			maxAge: 60 * 60 * 24 * 7 // 7 days
		});
		
		console.log('✅ [REMOTE] Login successful:', user.email);
		return { user, session: authData.session };
	}
);

// Register new user
export const register = command(
	registerSchema,
	async (userData): Promise<any> => {
		console.log('🔐 [REMOTE] Registering user:', userData.email);
		
		const supabase = createSupabaseClient();
		
		// Create auth user
		const { data: authData, error: authError } = await supabase.auth.signUp({
			email: userData.email,
			password: userData.password
		});
		
		if (authError || !authData.user) {
			console.error('❌ [REMOTE] Registration failed:', authError?.message);
			throw new Error(authError?.message || 'Registration failed');
		}
		
		// Create user profile
		const { error: profileError } = await supabase
			.from('users')
			.insert({
				id: authData.user.id,
				email: userData.email,
				full_name: userData.full_name,
				role: userData.role,
				is_active: true,
				permissions: ['pos:operate', 'reports:view'],
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			});
		
		if (profileError) {
			console.error('❌ [REMOTE] Profile creation error:', profileError);
			throw new Error('Failed to create user profile');
		}
		
		const user = {
			id: authData.user.id,
			email: authData.user.email,
			full_name: userData.full_name,
			role: userData.role,
			is_active: true,
			is_verified: false,
			permissions: ['pos:operate', 'reports:view'],
			created_at: authData.user.created_at,
			updated_at: authData.user.updated_at
		};
		
		console.log('✅ [REMOTE] Registration successful:', user.email);
		return { user, session: authData.session };
	}
);

// Logout
export const logout = command(
	z.object({}),
	async (): Promise<{ success: boolean }> => {
		console.log('🔐 [REMOTE] Logging out user');
		
		const supabase = createSupabaseClient();
		
		// Sign out from Supabase
		const { error } = await supabase.auth.signOut();
		
		if (error) {
			console.error('❌ [REMOTE] Logout error:', error);
		}
		
		// Clear session cookies
		const event = getRequestEvent();
		event.cookies.delete('session_user', { path: '/' });
		event.cookies.delete('session_token', { path: '/' });
		
		console.log('✅ [REMOTE] Logout successful');
		return { success: true };
	}
);

// Update user profile
export const updateProfile = command(
	updateProfileSchema,
	async (profileData): Promise<any> => {
		const user = getAuthenticatedUser();
		console.log('🔐 [REMOTE] Updating profile for:', user.email);
		
		const supabase = createSupabaseClient();
		
		// Update user profile
		const { data: updatedProfile, error } = await supabase
			.from('users')
			.update({
				...profileData,
				updated_at: new Date().toISOString()
			})
			.eq('id', user.id)
			.select()
			.single();
		
		if (error) {
			console.error('❌ [REMOTE] Profile update error:', error);
			throw error;
		}
		
		console.log('✅ [REMOTE] Profile updated');
		return updatedProfile;
	}
);

// Change password
export const changePassword = command(
	changePasswordSchema,
	async (passwordData): Promise<{ success: boolean }> => {
		const user = getAuthenticatedUser();
		console.log('🔐 [REMOTE] Changing password for:', user.email);
		
		const supabase = createSupabaseClient();
		
		// Update password in Supabase Auth
		const { error } = await supabase.auth.updateUser({
			password: passwordData.new_password
		});
		
		if (error) {
			console.error('❌ [REMOTE] Password change error:', error);
			throw new Error(error.message);
		}
		
		console.log('✅ [REMOTE] Password changed successfully');
		return { success: true };
	}
);

// Login with PIN (for staff mode)
export const loginWithPin = command(
	pinLoginSchema,
	async (pinData): Promise<any> => {
		console.log('🔐 [REMOTE] PIN login attempt');
		
		const supabase = createSupabaseClient();
		
		// Find user with matching PIN
		const { data: profile, error } = await supabase
			.from('users')
			.select('*')
			.eq('pin', pinData.pin)
			.eq('is_active', true)
			.single();
		
		if (error || !profile) {
			console.error('❌ [REMOTE] Invalid PIN');
			throw new Error('Invalid PIN');
		}
		
		// Check if user has management privileges
		if (!['admin', 'owner', 'manager'].includes(profile.role)) {
			throw new Error('Insufficient privileges for PIN login');
		}
		
		const user = {
			id: profile.id,
			email: profile.email,
			full_name: profile.full_name,
			role: profile.role,
			is_active: profile.is_active,
			is_verified: true,
			permissions: profile.permissions || ['pos:operate', 'reports:view'],
			created_at: profile.created_at,
			updated_at: profile.updated_at
		};
		
		console.log('✅ [REMOTE] PIN login successful:', user.email);
		return { user, isStaffMode: true };
	}
);

// Get auth statistics (admin/manager only)
export const getAuthStats = query(async (): Promise<any> => {
	const user = getAuthenticatedUser();
	if (!['admin', 'manager'].includes(user.role)) {
		throw new Error('Not authorized to view auth statistics');
	}
	
	console.log('🔐 [REMOTE] Fetching auth statistics');
	
	const supabase = createSupabaseClient();
	
	// Get user counts by role
	const { data: userStats, error } = await supabase
		.from('users')
		.select('role, is_active')
		.eq('is_active', true);
	
	if (error) {
		console.error('❌ [REMOTE] Auth stats error:', error);
		throw error;
	}
	
	const stats = {
		totalUsers: userStats?.length || 0,
		activeUsers: userStats?.filter(u => u.is_active).length || 0,
		usersByRole: userStats?.reduce((acc: any, user: any) => {
			acc[user.role] = (acc[user.role] || 0) + 1;
			return acc;
		}, {}) || {}
	};
	
	console.log('✅ [REMOTE] Auth stats fetched');
	return stats;
});

// Get user activity (admin/manager only)
export const getUserActivity = query(
	z.object({
		userId: z.string().optional(),
		limit: z.number().default(50)
	}).optional(),
	async (params = {}): Promise<any[]> => {
		const user = getAuthenticatedUser();
		if (!['admin', 'manager'].includes(user.role)) {
			throw new Error('Not authorized to view user activity');
		}
		
		console.log('🔐 [REMOTE] Fetching user activity');
		
		const supabase = createSupabaseClient();
		
		let query = supabase
			.from('user_activity')
			.select('*')
			.order('created_at', { ascending: false })
			.limit(params.limit || 50);
		
		if (params.userId) {
			query = query.eq('user_id', params.userId);
		}
		
		const { data, error } = await query;
		
		if (error) {
			console.error('❌ [REMOTE] User activity error:', error);
			throw error;
		}
		
		console.log('✅ [REMOTE] User activity fetched:', data?.length || 0, 'records');
		return data || [];
	}
);