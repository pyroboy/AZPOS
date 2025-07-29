import { getContext } from 'telefunc';
import {
	loginSchema,
	registerSchema,
	passwordResetRequestSchema,
	emailVerificationSchema,
	profileUpdateSchema,
	changePasswordSchema,
	pinLoginSchema,
	type AuthUser,
	type AuthSession,
	type AuthStats,
	type AuthActivity
} from '$lib/types/auth.schema';
import { createSupabaseClient } from '$lib/server/db';

// Helper function to create auth session
function createAuthSession(user: AuthUser, accessToken: string, refreshToken: string): AuthSession {
	return {
		user: {
			id: user.id,
			email: user.email,
			full_name: user.full_name,
			role: user.role,
			is_active: user.is_active,
			is_verified: user.is_verified,
			permissions: user.permissions || [],
			profile: user.profile,
			last_login_at: user.last_login_at,
			created_at: user.created_at,
			updated_at: user.updated_at
		},
		access_token: accessToken,
		refresh_token: refreshToken,
		expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours
		session_id: crypto.randomUUID(),
		is_staff_mode: false
	};
}

// Telefunc to login user
export async function onLogin(loginData: unknown): Promise<AuthSession> {
	const validatedData = loginSchema.parse(loginData);
	const supabase = createSupabaseClient();

	// Authenticate with Supabase Auth
	const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
		email: validatedData.email,
		password: validatedData.password
	});

	if (authError || !authData.user) {
		// Log failed login attempt
		await supabase.from('auth_activities').insert({
			action: 'failed_login',
			ip_address: getContext().request?.headers?.get('x-forwarded-for') || 'unknown',
			user_agent: getContext().request?.headers?.get('user-agent'),
			success: false,
			error_message: authError?.message || 'Invalid credentials',
			created_at: new Date().toISOString()
		});

		throw new Error('Invalid email or password');
	}

	// Get user profile from our users table
	const { data: user, error: userError } = await supabase
		.from('users')
		.select('*')
		.eq('id', authData.user.id)
		.single();

	if (userError || !user) {
		throw new Error('User profile not found');
	}

	if (!user.is_active) {
		throw new Error('Account is deactivated');
	}

	// Update last login - Note: database schema doesn't have last_login_at or login_count
	// So we'll just update the updated_at timestamp
	await supabase
		.from('users')
		.update({
			updated_at: new Date().toISOString()
		})
		.eq('id', user.id);

	// Log successful login
	await supabase.from('auth_activities').insert({
		user_id: user.id,
		action: 'login',
		ip_address: getContext().request?.headers?.get('x-forwarded-for') || 'unknown',
		user_agent: getContext().request?.headers?.get('user-agent'),
		success: true,
		created_at: new Date().toISOString()
	});

	// Transform database user to AuthUser format for session
	return createAuthSession(
		{
			id: user.id,
			email: `${user.username}@local.pos`, // Create synthetic email for compatibility
			full_name: user.full_name,
			role: user.role === 'staff' ? 'cashier' : user.role,
			is_active: user.is_active,
			is_verified: true, // Staff users are considered verified
			permissions: [], // Will be populated based on role
			profile: {
				pin: user.pin_hash
			},
			last_login_at: new Date().toISOString(),
			created_at: user.created_at,
			updated_at: user.updated_at
		},
		authData.session?.access_token || '',
		authData.session?.refresh_token || ''
	);
}

// Telefunc to register new user
export async function onRegister(registerData: unknown): Promise<AuthSession> {
	const validatedData = registerSchema.parse(registerData);
	const supabase = createSupabaseClient();

	// Check if username already exists (database schema uses username, not email)
	const { data: existingUser } = await supabase
		.from('users')
		.select('id')
		.eq('username', validatedData.email.split('@')[0]) // Extract username from email
		.single();

	if (existingUser) {
		throw new Error('Username already registered');
	}

	// Create auth user with Supabase Auth
	const { data: authData, error: authError } = await supabase.auth.signUp({
		email: validatedData.email,
		password: validatedData.password,
		options: {
			data: {
				full_name: validatedData.full_name
			}
		}
	});

	if (authError || !authData.user) {
		throw new Error(authError?.message || 'Registration failed');
	}

	// Create user profile in our users table
	// Note: The database schema doesn't have email, is_verified, permissions, or login_count fields
	const { data: user, error: userError } = await supabase
		.from('users')
		.insert({
			id: authData.user.id,
			username: validatedData.email.split('@')[0], // Extract username from email
			full_name: validatedData.full_name,
			role: validatedData.role === 'customer' ? 'cashier' : validatedData.role, // Map customer to cashier
			pin_hash: '', // Default empty PIN hash for new users
			is_active: true,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		})
		.select()
		.single();

	if (userError) {
		throw new Error('Failed to create user profile');
	}

	// Log registration
	await supabase.from('auth_activities').insert({
		user_id: user.id,
		action: 'register',
		ip_address: getContext().request?.headers?.get('x-forwarded-for') || 'unknown',
		user_agent: getContext().request?.headers?.get('user-agent'),
		success: true,
		created_at: new Date().toISOString()
	});

	// Transform database user to AuthUser format for session
	return createAuthSession(
		{
			id: user.id,
			email: `${user.username}@local.pos`, // Create synthetic email for compatibility
			full_name: user.full_name,
			role: user.role === 'staff' ? 'cashier' : user.role,
			is_active: user.is_active,
			is_verified: true, // Staff users are considered verified
			permissions: [], // Will be populated based on role
			profile: {
				pin: user.pin_hash || ''
			},
			last_login_at: new Date().toISOString(),
			created_at: user.created_at,
			updated_at: user.updated_at
		},
		authData.session?.access_token || '',
		authData.session?.refresh_token || ''
	);
}

// Telefunc to logout user
export async function onLogout(): Promise<{ success: boolean }> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	const supabase = createSupabaseClient();

	// Sign out from Supabase Auth
	await supabase.auth.signOut();

	// Log logout
	await supabase.from('auth_activities').insert({
		user_id: user.id,
		action: 'logout',
		ip_address: getContext().request?.headers?.get('x-forwarded-for') || 'unknown',
		user_agent: getContext().request?.headers?.get('user-agent'),
		success: true,
		created_at: new Date().toISOString()
	});

	return { success: true };
}

// Telefunc to get current user
export async function onGetCurrentUser(): Promise<AuthUser | null> {
	const { user } = getContext();
	if (!user) return null;

	const supabase = createSupabaseClient();

	const { data: userData, error } = await supabase
		.from('users')
		.select('*')
		.eq('id', user.id)
		.single();

	if (error || !userData) return null;

	// Transform database user to AuthUser format
	// The database schema doesn't have email, profile, permissions, is_verified, or last_login_at fields
	// Create a synthetic email for compatibility and build profile object
	return {
		id: userData.id,
		email: `${userData.username}@local.pos`, // Create synthetic email for compatibility
		full_name: userData.full_name,
		role: userData.role === 'staff' ? 'cashier' : userData.role,
		is_active: userData.is_active,
		is_verified: true, // Staff users are considered verified
		permissions: [], // Will be populated based on role
		profile: {
			pin: userData.pin_hash
		},
		last_login_at: new Date().toISOString(), // Current timestamp as fallback
		created_at: userData.created_at,
		updated_at: userData.updated_at
	};
}

// Telefunc to update user profile
export async function onUpdateProfile(profileData: unknown): Promise<AuthUser> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	const validatedData = profileUpdateSchema.parse(profileData);
	const supabase = createSupabaseClient();

	const updateData: Partial<AuthUser> = {
		updated_at: new Date().toISOString()
	};

	if (validatedData.full_name) {
		updateData.full_name = validatedData.full_name;
	}

	if (validatedData.profile) {
		const prefs = validatedData.profile.preferences ?? {};
		updateData.profile = {
			...validatedData.profile,
			preferences: {
				language: prefs.language ?? 'en',
				timezone: prefs.timezone ?? 'UTC',
				currency: prefs.currency ?? 'USD',
				notifications: {
					push: prefs.notifications?.push ?? false,
					email: prefs.notifications?.email ?? false,
					sms: prefs.notifications?.sms ?? false
				}
			}
		};
	}

	const { data: updatedUser, error } = await supabase
		.from('users')
		.update(updateData)
		.eq('id', user.id)
		.select()
		.single();

	if (error) throw error;

	// Log profile update
	await supabase.from('auth_activities').insert({
		user_id: user.id,
		action: 'profile_update',
		success: true,
		created_at: new Date().toISOString()
	});

	return {
		id: updatedUser.id,
		email: updatedUser.email,
		full_name: updatedUser.full_name,
		role: updatedUser.role,
		is_active: updatedUser.is_active,
		is_verified: updatedUser.is_verified,
		permissions: updatedUser.permissions || [],
		profile: updatedUser.profile,
		last_login_at: updatedUser.last_login_at,
		created_at: updatedUser.created_at,
		updated_at: updatedUser.updated_at
	};
}

// Telefunc to change password
export async function onChangePassword(passwordData: unknown): Promise<{ success: boolean }> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	const validatedData = changePasswordSchema.parse(passwordData);
	const supabase = createSupabaseClient();

	// Update password with Supabase Auth
	const { error } = await supabase.auth.updateUser({
		password: validatedData.new_password
	});

	if (error) {
		throw new Error(error.message);
	}

	// Log password change
	await supabase.from('auth_activities').insert({
		user_id: user.id,
		action: 'password_change',
		success: true,
		created_at: new Date().toISOString()
	});

	return { success: true };
}

// Telefunc to request password reset
export async function onRequestPasswordReset(resetData: unknown): Promise<{ success: boolean }> {
	const validatedData = passwordResetRequestSchema.parse(resetData);
	const supabase = createSupabaseClient();

	// Send password reset email with Supabase Auth
	const { error } = await supabase.auth.resetPasswordForEmail(validatedData.email, {
		redirectTo: `${process.env.PUBLIC_APP_URL}/reset-password`
	});

	if (error) {
		throw new Error(error.message);
	}

	return { success: true };
}

// Telefunc to verify email
export async function onVerifyEmail(verificationData: unknown): Promise<{ success: boolean }> {
	const validatedData = emailVerificationSchema.parse(verificationData);
	const supabase = createSupabaseClient();

	// Verify email with Supabase Auth
	const { error } = await supabase.auth.verifyOtp({
		token_hash: validatedData.token,
		type: 'email'
	});

	if (error) {
		throw new Error(error.message);
	}

	return { success: true };
}

// Telefunc to get auth statistics
export async function onGetAuthStats(): Promise<AuthStats> {
	const { user } = getContext();
	if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
		throw new Error('Not authorized - admin/manager access required');
	}

	const supabase = createSupabaseClient();

	// Get user counts
	const { data: users, error: usersError } = await supabase
		.from('users')
		.select('is_active, is_verified, created_at');

	if (usersError) throw usersError;

	// Get today's activities
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const { data: activities, error: activitiesError } = await supabase
		.from('auth_activities')
		.select('action, success, created_at')
		.gte('created_at', today.toISOString());

	if (activitiesError) throw activitiesError;

	const stats = {
		total_users: users?.length || 0,
		active_sessions: 0, // Would need session tracking
		login_attempts_today: 0,
		successful_logins_today: 0,
		failed_logins_today: 0,
		new_registrations_today: 0,
		password_resets_today: 0,
		email_verifications_pending: 0,
		two_factor_enabled_users: 0
	};

	// Calculate today's stats
	activities?.forEach((activity) => {
		const activityDate = new Date(activity.created_at);
		if (activityDate >= today) {
			switch (activity.action) {
				case 'login':
					if (activity.success) {
						stats.successful_logins_today++;
					}
					break;
				case 'failed_login':
					stats.failed_logins_today++;
					break;
				case 'register':
					if (activity.success) {
						stats.new_registrations_today++;
					}
					break;
				case 'password_reset':
					stats.password_resets_today++;
					break;
			}
		}
	});

	stats.login_attempts_today = stats.successful_logins_today + stats.failed_logins_today;

	// Count unverified users
	stats.email_verifications_pending = users?.filter((user) => !user.is_verified).length || 0;

	return stats;
}

// Telefunc to get user activity
export async function onGetUserActivity(
	userId?: string,
	limit: number = 50
): Promise<AuthActivity[]> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	// Users can only view their own activity unless they're admin/manager
	if (userId && userId !== user.id && user.role !== 'admin' && user.role !== 'manager') {
		throw new Error('Not authorized');
	}

	const supabase = createSupabaseClient();

	let query = supabase
		.from('auth_activities')
		.select('*')
		.order('created_at', { ascending: false })
		.limit(limit);

	if (userId) {
		query = query.eq('user_id', userId);
	}

	const { data: activities, error } = await query;
	if (error) throw error;

	return activities || [];
}

// Helper function to hash PIN using Web Crypto API
async function hashPin(pin: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(pin);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Helper function to verify PIN
async function verifyPin(pin: string, hash: string): Promise<boolean> {
	const pinHash = await hashPin(pin);
	return pinHash === hash;
}

// Telefunc to login with PIN (staff authentication)
export async function onLoginWithPin(pinData: unknown): Promise<AuthSession> {
	const validatedData = pinLoginSchema.parse(pinData);
	const supabase = createSupabaseClient();

	// For PIN authentication, we'll use the users table directly since we don't have Supabase Auth for PINs
	// We need to query users that have PIN hashes (staff members)
	const { data: users, error: usersError } = await supabase
		.from('users')
		.select('*')
		.not('pin_hash', 'is', null)
		.eq('is_active', true);

	if (usersError) {
		throw new Error('Failed to query users');
	}

	if (!users || users.length === 0) {
		// Log failed PIN login attempt
		await supabase.from('auth_activities').insert({
			action: 'failed_pin_login',
			ip_address: getContext().request?.headers?.get('x-forwarded-for') || 'unknown',
			user_agent: getContext().request?.headers?.get('user-agent'),
			success: false,
			error_message: 'No staff users with PINs found',
			created_at: new Date().toISOString()
		});
		throw new Error('Invalid PIN');
	}

	// Check PIN against all staff users
	let authenticatedUser = null;
	for (const user of users) {
		if (user.pin_hash && (await verifyPin(validatedData.pin, user.pin_hash))) {
			authenticatedUser = user;
			break;
		}
	}

	if (!authenticatedUser) {
		// Log failed PIN login attempt
		await supabase.from('auth_activities').insert({
			action: 'failed_pin_login',
			ip_address: getContext().request?.headers?.get('x-forwarded-for') || 'unknown',
			user_agent: getContext().request?.headers?.get('user-agent'),
			success: false,
			error_message: 'Invalid PIN',
			created_at: new Date().toISOString()
		});
		throw new Error('Invalid PIN');
	}

	// Update last login - Note: the database schema doesn't show login_count or last_login_at
	// So we'll just update the updated_at timestamp
	await supabase
		.from('users')
		.update({
			updated_at: new Date().toISOString()
		})
		.eq('id', authenticatedUser.id);

	// Log successful PIN login
	await supabase.from('auth_activities').insert({
		user_id: authenticatedUser.id,
		action: 'pin_login',
		ip_address: getContext().request?.headers?.get('x-forwarded-for') || 'unknown',
		user_agent: getContext().request?.headers?.get('user-agent'),
		success: true,
		created_at: new Date().toISOString()
	});

	// Create session without Supabase Auth tokens (using temporary tokens)
	const sessionToken = crypto.randomUUID();
	const refreshToken = crypto.randomUUID();

	// Create a compatible AuthUser object from the database user
	// Since the database schema uses username instead of email, we'll use username@local.pos as email
	return createAuthSession(
		{
			id: authenticatedUser.id,
			email: `${authenticatedUser.username}@local.pos`, // Create synthetic email for compatibility
			full_name: authenticatedUser.full_name,
			role: authenticatedUser.role === 'staff' ? 'cashier' : authenticatedUser.role, // Map staff to cashier
			is_active: authenticatedUser.is_active,
			is_verified: true, // Staff users are considered verified
			permissions: [], // Will be populated based on role
			profile: {
				pin: authenticatedUser.pin_hash
			},
			last_login_at: new Date().toISOString(),
			created_at: authenticatedUser.created_at,
			updated_at: authenticatedUser.updated_at
		},
		sessionToken,
		refreshToken
	);
}

// Telefunc to toggle staff mode (for authenticated users)
export async function onToggleStaffMode(): Promise<{ isStaffMode: boolean; user: AuthUser }> {
	const { user } = getContext();
	if (!user) throw new Error('Not authenticated');

	const supabase = createSupabaseClient();

	// Get current user data
	const { data: userData, error } = await supabase
		.from('users')
		.select('*')
		.eq('id', user.id)
		.single();

	if (error || !userData) {
		throw new Error('User not found');
	}

	// Only staff members (non-customers) can toggle staff mode
	// Based on the database schema, we don't have 'customer' role, so we check for staff roles
	const staffRoles = ['admin', 'owner', 'manager', 'cashier', 'staff'];
	if (!staffRoles.includes(userData.role)) {
		throw new Error('Only staff members can toggle staff mode');
	}

	// Log staff mode toggle
	await supabase.from('auth_activities').insert({
		user_id: user.id,
		action: 'staff_mode_toggle',
		ip_address: getContext().request?.headers?.get('x-forwarded-for') || 'unknown',
		user_agent: getContext().request?.headers?.get('user-agent'),
		success: true,
		created_at: new Date().toISOString()
	});

	// Return user data and indicate staff mode is toggled
	// Note: The actual staff mode state is managed on the client side
	// This function just validates the user can toggle and logs the action
	return {
		isStaffMode: true, // This would be toggled on the client side
		user: {
			id: userData.id,
			email: `${userData.username}@local.pos`, // Create synthetic email for compatibility
			full_name: userData.full_name,
			role: userData.role === 'staff' ? 'cashier' : userData.role, // Map staff to cashier
			is_active: userData.is_active,
			is_verified: true, // Staff users are considered verified
			permissions: [], // Will be populated based on role
			profile: {
				pin: userData.pin_hash
			},
			last_login_at: new Date().toISOString(),
			created_at: userData.created_at,
			updated_at: userData.updated_at
		}
	};
}
