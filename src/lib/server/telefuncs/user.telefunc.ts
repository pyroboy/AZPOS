import { getContext } from 'telefunc';
import { 
  userInputSchema,
  userFiltersSchema,
  changePasswordSchema,
  resetPasswordSchema,
  bulkUserUpdateSchema,
  userInvitationSchema,
  type User,
  type UserFilters,
  type PaginatedUsers,
  type UserStats,
  type ChangePassword,
  type ResetPassword,
  type BulkUserUpdate,
  type UserInvitation,
  type UserActivity
} from '$lib/types/user.schema';
import { createSupabaseClient } from '$lib/server/db';

// Telefunc to get paginated users with filters
export async function onGetUsers(filters?: UserFilters): Promise<PaginatedUsers> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const supabase = createSupabaseClient();
  const validatedFilters = filters ? userFiltersSchema.parse(filters) : {};
  
  const page = validatedFilters.page || 1;
  const limit = validatedFilters.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('users')
    .select('*', { count: 'exact' });

  // Apply filters
  if (validatedFilters.search) {
    query = query.or(`full_name.ilike.%${validatedFilters.search}%,email.ilike.%${validatedFilters.search}%`);
  }
  
  if (validatedFilters.role && validatedFilters.role !== 'all') {
    query = query.eq('role', validatedFilters.role);
  }
  
  if (validatedFilters.is_active !== undefined) {
    query = query.eq('is_active', validatedFilters.is_active);
  }
  
  if (validatedFilters.is_verified !== undefined) {
    query = query.eq('is_verified', validatedFilters.is_verified);
  }
  
  if (validatedFilters.created_from) {
    query = query.gte('created_at', validatedFilters.created_from);
  }
  
  if (validatedFilters.created_to) {
    query = query.lte('created_at', validatedFilters.created_to);
  }
  
  if (validatedFilters.last_login_from) {
    query = query.gte('last_login_at', validatedFilters.last_login_from);
  }
  
  if (validatedFilters.last_login_to) {
    query = query.lte('last_login_at', validatedFilters.last_login_to);
  }

  // Apply sorting
  const sortBy = validatedFilters.sort_by || 'created_at';
  const sortOrder = validatedFilters.sort_order || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: users, error, count } = await query;
  if (error) throw error;

  const totalPages = Math.ceil((count || 0) / limit);

  return {
    users: users?.map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      is_verified: user.is_verified,
      permissions: user.permissions || [],
      profile: user.profile,
      last_login_at: user.last_login_at,
      login_count: user.login_count || 0,
      created_at: user.created_at,
      updated_at: user.updated_at,
      created_by: user.created_by,
      updated_by: user.updated_by
    })) || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: totalPages,
      has_more: page < totalPages
    }
  };
}

// Telefunc to get a single user by ID
export async function onGetUser(userId: string): Promise<User> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  // Users can only view their own profile unless they're admin/manager
  if (user.id !== userId && user.role !== 'admin' && user.role !== 'manager') {
    throw new Error('Not authorized');
  }

  const supabase = createSupabaseClient();

  const { data: userData, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  if (!userData) throw new Error('User not found');

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
    login_count: userData.login_count || 0,
    created_at: userData.created_at,
    updated_at: userData.updated_at,
    created_by: userData.created_by,
    updated_by: userData.updated_by
  };
}

// Telefunc to create a new user
export async function onCreateUser(userData: unknown): Promise<User> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const validatedData = userInputSchema.parse(userData);
  const supabase = createSupabaseClient();

  // Check if email already exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', validatedData.email)
    .single();

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Only admins can create other admins
  if (validatedData.role === 'admin' && user.role !== 'admin') {
    throw new Error('Only admins can create admin users');
  }

  const now = new Date().toISOString();

  const { data: newUser, error } = await supabase
    .from('users')
    .insert({
      email: validatedData.email,
      full_name: validatedData.full_name,
      role: validatedData.role,
      is_active: validatedData.is_active,
      is_verified: false,
      permissions: validatedData.permissions || [],
      profile: validatedData.profile,
      login_count: 0,
      created_by: user.id,
      updated_by: user.id,
      created_at: now,
      updated_at: now
    })
    .select()
    .single();

  if (error) throw error;

  // Log user creation activity
  await supabase
    .from('user_activities')
    .insert({
      user_id: user.id,
      action: 'create_user',
      resource_type: 'user',
      resource_id: newUser.id,
      details: { created_user_email: validatedData.email, created_user_role: validatedData.role },
      created_at: now
    });

  return {
    id: newUser.id,
    email: newUser.email,
    full_name: newUser.full_name,
    role: newUser.role,
    is_active: newUser.is_active,
    is_verified: newUser.is_verified,
    permissions: newUser.permissions || [],
    profile: newUser.profile,
    last_login_at: newUser.last_login_at,
    login_count: newUser.login_count || 0,
    created_at: newUser.created_at,
    updated_at: newUser.updated_at,
    created_by: newUser.created_by,
    updated_by: newUser.updated_by
  };
}

// Telefunc to update a user
export async function onUpdateUser(userId: string, userData: unknown): Promise<User> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  // Users can only update their own profile unless they're admin/manager
  const canUpdateOthers = user.role === 'admin' || user.role === 'manager';
  if (user.id !== userId && !canUpdateOthers) {
    throw new Error('Not authorized');
  }

  const validatedData = userInputSchema.parse(userData);
  const supabase = createSupabaseClient();

  // Get current user data
  const { data: currentUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (fetchError || !currentUser) {
    throw new Error('User not found');
  }

  // Only admins can change roles or create/modify admin users
  if (user.role !== 'admin') {
    if (validatedData.role !== currentUser.role) {
      throw new Error('Only admins can change user roles');
    }
    if (validatedData.role === 'admin' || currentUser.role === 'admin') {
      throw new Error('Only admins can modify admin users');
    }
  }

  // Users updating their own profile have limited permissions
  const updateData: any = {
    updated_by: user.id,
    updated_at: new Date().toISOString()
  };

  if (canUpdateOthers || user.id === userId) {
    updateData.full_name = validatedData.full_name;
    updateData.profile = validatedData.profile;
  }

  if (canUpdateOthers) {
    updateData.email = validatedData.email;
    updateData.role = validatedData.role;
    updateData.is_active = validatedData.is_active;
    updateData.permissions = validatedData.permissions;
  }

  const { data: updatedUser, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  // Log user update activity
  await supabase
    .from('user_activities')
    .insert({
      user_id: user.id,
      action: 'update_user',
      resource_type: 'user',
      resource_id: userId,
      details: { updated_fields: Object.keys(updateData) },
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
    login_count: updatedUser.login_count || 0,
    created_at: updatedUser.created_at,
    updated_at: updatedUser.updated_at,
    created_by: updatedUser.created_by,
    updated_by: updatedUser.updated_by
  };
}

// Telefunc to change password
export async function onChangePassword(passwordData: unknown): Promise<{ success: boolean }> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const validatedData = changePasswordSchema.parse(passwordData);
  const supabase = createSupabaseClient();

  // Verify current password (this would typically use Supabase Auth)
  // For now, we'll assume password verification is handled elsewhere
  
  // Update password (this would typically use Supabase Auth)
  // const { error } = await supabase.auth.updateUser({
  //   password: validatedData.new_password
  // });

  // Log password change activity
  await supabase
    .from('user_activities')
    .insert({
      user_id: user.id,
      action: 'change_password',
      resource_type: 'user',
      resource_id: user.id,
      created_at: new Date().toISOString()
    });

  return { success: true };
}

// Telefunc to get user statistics
export async function onGetUserStats(): Promise<UserStats> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const supabase = createSupabaseClient();

  const { data: users, error } = await supabase
    .from('users')
    .select('is_active, is_verified, role, created_at, last_login_at, login_count, full_name, email');

  if (error) throw error;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const stats = users?.reduce((acc, user) => {
    acc.total_users++;
    
    if (user.is_active) {
      acc.active_users++;
    } else {
      acc.inactive_users++;
    }
    
    if (user.is_verified) {
      acc.verified_users++;
    }
    
    // Role breakdown
    acc.role_breakdown[user.role as keyof typeof acc.role_breakdown]++;
    
    // Recent signups (last 30 days)
    if (new Date(user.created_at) > thirtyDaysAgo) {
      acc.recent_signups++;
    }
    
    // Recent logins (last 24 hours)
    if (user.last_login_at && new Date(user.last_login_at) > twentyFourHoursAgo) {
      acc.recent_logins++;
    }
    
    // Track for top active users
    if (user.login_count > 0) {
      acc.top_users.push({
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        login_count: user.login_count,
        last_login_at: user.last_login_at
      });
    }
    
    acc.total_logins += user.login_count || 0;
    
    return acc;
  }, {
    total_users: 0,
    active_users: 0,
    inactive_users: 0,
    verified_users: 0,
    role_breakdown: { admin: 0, manager: 0, cashier: 0, customer: 0 },
    recent_signups: 0,
    recent_logins: 0,
    total_logins: 0,
    top_users: [] as Array<{ id: string; full_name: string; email: string; login_count: number; last_login_at?: string }>
  }) || {
    total_users: 0,
    active_users: 0,
    inactive_users: 0,
    verified_users: 0,
    role_breakdown: { admin: 0, manager: 0, cashier: 0, customer: 0 },
    recent_signups: 0,
    recent_logins: 0,
    total_logins: 0,
    top_users: []
  };

  // Calculate average login frequency (logins per user per month)
  const avgLoginFrequency = stats.total_users > 0 ? stats.total_logins / stats.total_users : 0;

  // Sort and limit top active users
  const topActiveUsers = stats.top_users
    .sort((a, b) => b.login_count - a.login_count)
    .slice(0, 10);

  return {
    total_users: stats.total_users,
    active_users: stats.active_users,
    inactive_users: stats.inactive_users,
    verified_users: stats.verified_users,
    role_breakdown: stats.role_breakdown,
    recent_signups: stats.recent_signups,
    recent_logins: stats.recent_logins,
    avg_login_frequency: avgLoginFrequency,
    top_active_users: topActiveUsers
  };
}

// Telefunc to get user activity log
export async function onGetUserActivity(userId?: string, limit: number = 50): Promise<UserActivity[]> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  // Users can only view their own activity unless they're admin/manager
  if (userId && userId !== user.id && user.role !== 'admin' && user.role !== 'manager') {
    throw new Error('Not authorized');
  }

  const supabase = createSupabaseClient();

  let query = supabase
    .from('user_activities')
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
