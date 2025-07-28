import { getContext } from 'telefunc';
import { 
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
  emailVerificationSchema,
  profileUpdateSchema,
  changePasswordSchema,
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
    session_id: crypto.randomUUID()
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
    await supabase
      .from('auth_activities')
      .insert({
        action: 'failed_login',
        ip_address: getContext().request?.headers?.['x-forwarded-for'] || 'unknown',
        user_agent: getContext().request?.headers?.['user-agent'],
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

  // Update last login
  await supabase
    .from('users')
    .update({
      last_login_at: new Date().toISOString(),
      login_count: (user.login_count || 0) + 1
    })
    .eq('id', user.id);

  // Log successful login
  await supabase
    .from('auth_activities')
    .insert({
      user_id: user.id,
      action: 'login',
      ip_address: getContext().request?.headers?.['x-forwarded-for'] || 'unknown',
      user_agent: getContext().request?.headers?.['user-agent'],
      success: true,
      created_at: new Date().toISOString()
    });

  return createAuthSession(
    user,
    authData.session?.access_token || '',
    authData.session?.refresh_token || ''
  );
}

// Telefunc to register new user
export async function onRegister(registerData: unknown): Promise<AuthSession> {
  const validatedData = registerSchema.parse(registerData);
  const supabase = createSupabaseClient();

  // Check if email already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', validatedData.email)
    .single();

  if (existingUser) {
    throw new Error('Email already registered');
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
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email: validatedData.email,
      full_name: validatedData.full_name,
      role: validatedData.role,
      is_active: true,
      is_verified: false,
      permissions: [],
      login_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (userError) {
    throw new Error('Failed to create user profile');
  }

  // Log registration
  await supabase
    .from('auth_activities')
    .insert({
      user_id: user.id,
      action: 'register',
      ip_address: getContext().request?.headers?.['x-forwarded-for'] || 'unknown',
      user_agent: getContext().request?.headers?.['user-agent'],
      success: true,
      created_at: new Date().toISOString()
    });

  return createAuthSession(
    user,
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
  await supabase
    .from('auth_activities')
    .insert({
      user_id: user.id,
      action: 'logout',
      ip_address: getContext().request?.headers?.['x-forwarded-for'] || 'unknown',
      user_agent: getContext().request?.headers?.['user-agent'],
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

  return {
    id: userData.id,
    email: userData.email,
    full_name: userData.full_name,
    role: userData.role,
    is_active: userData.is_active,
    is_verified: userData.is_verified,
    permissions: userData.permissions || [],
    profile: userData.profile,
    last_login_at: userData.last_login_at,
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
  await supabase
    .from('auth_activities')
    .insert({
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
  await supabase
    .from('auth_activities')
    .insert({
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
  activities?.forEach(activity => {
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
  stats.email_verifications_pending = users?.filter(user => !user.is_verified).length || 0;

  return stats;
}

// Telefunc to get user activity
export async function onGetUserActivity(userId?: string, limit: number = 50): Promise<AuthActivity[]> {
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
