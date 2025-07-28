import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { 
  onLogin, 
  onRegister, 
  onLogout, 
  onGetCurrentUser, 
  onUpdateProfile, 
  onChangePassword, 
  onRequestPasswordReset, 
  onVerifyEmail,
  onGetAuthStats,
  onGetUserActivity
} from '$lib/server/telefuncs/auth.telefunc';
import type { 
  AuthUser, 
  AuthSession, 
  Login, 
  Register, 
  ProfileUpdate, 
  ChangePassword,
  PasswordResetRequest,
  EmailVerification,
  AuthStats,
  AuthActivity
} from '$lib/types/auth.schema';

const authQueryKey = ['auth'];
const authStatsQueryKey = ['auth-stats'];
const userActivityQueryKey = ['user-activity'];

export function useAuth() {
  const queryClient = useQueryClient();

  // Query for current user
  const currentUserQuery = createQuery<AuthUser | null>({
    queryKey: [...authQueryKey, 'current-user'],
    queryFn: onGetCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Query for auth statistics (admin/manager only)
  const authStatsQuery = createQuery<AuthStats>({
    queryKey: authStatsQueryKey,
    queryFn: onGetAuthStats,
    enabled: $derived(!!currentUserQuery.data && ['admin', 'manager'].includes(currentUserQuery.data.role))
  });

  // Mutation to login
  const loginMutation = createMutation({
    mutationFn: (loginData: Login) => onLogin(loginData),
    onSuccess: (authSession) => {
      // Update current user in cache
      queryClient.setQueryData([...authQueryKey, 'current-user'], authSession.user);
      
      // Invalidate auth-related queries
      queryClient.invalidateQueries({ queryKey: authQueryKey });
      queryClient.invalidateQueries({ queryKey: authStatsQueryKey });
    }
  });

  // Mutation to register
  const registerMutation = createMutation({
    mutationFn: (registerData: Register) => onRegister(registerData),
    onSuccess: (authSession) => {
      // Update current user in cache
      queryClient.setQueryData([...authQueryKey, 'current-user'], authSession.user);
      
      // Invalidate auth-related queries
      queryClient.invalidateQueries({ queryKey: authQueryKey });
      queryClient.invalidateQueries({ queryKey: authStatsQueryKey });
    }
  });

  // Mutation to logout
  const logoutMutation = createMutation({
    mutationFn: onLogout,
    onSuccess: () => {
      // Clear all cached data
      queryClient.clear();
      
      // Set current user to null
      queryClient.setQueryData([...authQueryKey, 'current-user'], null);
    }
  });

  // Mutation to update profile
  const updateProfileMutation = createMutation({
    mutationFn: (profileData: ProfileUpdate) => onUpdateProfile(profileData),
    onSuccess: (updatedUser) => {
      // Update current user in cache
      queryClient.setQueryData([...authQueryKey, 'current-user'], updatedUser);
      
      // Invalidate user-related queries
      queryClient.invalidateQueries({ queryKey: authQueryKey });
    }
  });

  // Mutation to change password
  const changePasswordMutation = createMutation({
    mutationFn: (passwordData: ChangePassword) => onChangePassword(passwordData)
  });

  // Mutation to request password reset
  const requestPasswordResetMutation = createMutation({
    mutationFn: (resetData: PasswordResetRequest) => onRequestPasswordReset(resetData)
  });

  // Mutation to verify email
  const verifyEmailMutation = createMutation({
    mutationFn: (verificationData: EmailVerification) => onVerifyEmail(verificationData),
    onSuccess: () => {
      // Refresh current user to get updated verification status
      queryClient.invalidateQueries({ queryKey: [...authQueryKey, 'current-user'] });
    }
  });

  // Derived reactive state
  const user = $derived(currentUserQuery.data);
  const isAuthenticated = $derived(!!user);
  const isLoading = $derived(currentUserQuery.isPending);
  const authStats = $derived(authStatsQuery.data);

  // Role-based helpers
  const isAdmin = $derived(user?.role === 'admin');
  const isManager = $derived(user?.role === 'manager');
  const isCashier = $derived(user?.role === 'cashier');
  const isCustomer = $derived(user?.role === 'customer');
  
  const canManageUsers = $derived(isAdmin || isManager);
  const canViewReports = $derived(isAdmin || isManager);
  const canProcessTransactions = $derived(isAdmin || isManager || isCashier);

  // Permission helpers
  function hasPermission(permission: string): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin has all permissions
    return user.permissions.includes(permission);
  }

  function hasAnyPermission(permissions: string[]): boolean {
    return permissions.some(permission => hasPermission(permission));
  }

  function hasAllPermissions(permissions: string[]): boolean {
    return permissions.every(permission => hasPermission(permission));
  }

  // Authentication actions
  function login(loginData: Login) {
    return loginMutation.mutateAsync(loginData);
  }

  function register(registerData: Register) {
    return registerMutation.mutateAsync(registerData);
  }

  function logout() {
    return logoutMutation.mutateAsync();
  }

  function updateProfile(profileData: ProfileUpdate) {
    return updateProfileMutation.mutateAsync(profileData);
  }

  function changePassword(passwordData: ChangePassword) {
    return changePasswordMutation.mutateAsync(passwordData);
  }

  function requestPasswordReset(resetData: PasswordResetRequest) {
    return requestPasswordResetMutation.mutateAsync(resetData);
  }

  function verifyEmail(verificationData: EmailVerification) {
    return verifyEmailMutation.mutateAsync(verificationData);
  }

  // User activity helper
  function useUserActivity(userId?: string, limit: number = 50) {
    return createQuery<AuthActivity[]>({
      queryKey: [...userActivityQueryKey, userId, limit],
      queryFn: () => onGetUserActivity(userId, limit),
      enabled: !!user
    });
  }

  return {
    // Queries and their states
    currentUserQuery,
    authStatsQuery,
    
    // Reactive data
    user,
    isAuthenticated,
    isLoading,
    authStats,
    
    // Role checks
    isAdmin,
    isManager,
    isCashier,
    isCustomer,
    canManageUsers,
    canViewReports,
    canProcessTransactions,
    
    // Permission helpers
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    
    // Authentication actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    requestPasswordReset,
    verifyEmail,
    
    // Mutation states
    loginStatus: $derived(loginMutation.status),
    registerStatus: $derived(registerMutation.status),
    logoutStatus: $derived(logoutMutation.status),
    updateProfileStatus: $derived(updateProfileMutation.status),
    changePasswordStatus: $derived(changePasswordMutation.status),
    requestPasswordResetStatus: $derived(requestPasswordResetMutation.status),
    verifyEmailStatus: $derived(verifyEmailMutation.status),
    
    // User activity helper
    useUserActivity,
    
    // Loading states
    isError: $derived(currentUserQuery.isError),
    error: $derived(currentUserQuery.error),
    
    // Stats loading
    isStatsLoading: $derived(authStatsQuery.isPending),
    statsError: $derived(authStatsQuery.error)
  };
}
