import { z } from 'zod';

// Schema for login credentials
export const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
	remember_me: z.boolean().optional()
});

// Schema for registration
export const registerSchema = z
	.object({
		email: z.string().email(),
		password: z.string().min(8),
		confirm_password: z.string().min(8),
		full_name: z.string().min(1),
		role: z.enum(['customer']).default('customer'), // Only customers can self-register
		terms_accepted: z.boolean().refine((val) => val === true, {
			message: 'Terms and conditions must be accepted'
		})
	})
	.refine((data) => data.password === data.confirm_password, {
		message: "Passwords don't match",
		path: ['confirm_password']
	});

// Schema for password reset request
export const passwordResetRequestSchema = z.object({
	email: z.string().email()
});

// Schema for password reset confirmation
export const passwordResetConfirmSchema = z
	.object({
		token: z.string().min(1),
		password: z.string().min(8),
		confirm_password: z.string().min(8)
	})
	.refine((data) => data.password === data.confirm_password, {
		message: "Passwords don't match",
		path: ['confirm_password']
	});

// Schema for email verification
export const emailVerificationSchema = z.object({
	token: z.string().min(1)
});

// Schema for authenticated user session
export const authUserSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	full_name: z.string(),
	role: z.enum(['guest', 'cashier', 'pharmacist', 'manager', 'admin', 'owner', 'customer']),
	is_active: z.boolean(),
	is_verified: z.boolean(),
	permissions: z.array(z.string()),
	profile: z
		.object({
			avatar_url: z.string().url().optional(),
			phone: z.string().optional(),
			pin: z.string().optional(),
			preferences: z
				.object({
					language: z.string().default('en'),
					timezone: z.string().default('UTC'),
					currency: z.string().default('USD'),
					notifications: z
						.object({
							email: z.boolean().default(true),
							sms: z.boolean().default(false),
							push: z.boolean().default(true)
						})
						.optional()
				})
				.optional()
		})
		.optional(),
	last_login_at: z.string().datetime().optional(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime()
});

// Schema for auth session
export const authSessionSchema = z.object({
	user: authUserSchema,
	access_token: z.string(),
	refresh_token: z.string(),
	expires_at: z.string().datetime(),
	session_id: z.string(),
	is_staff_mode: z.boolean()
});

// Schema for profile update
export const profileUpdateSchema = z.object({
	full_name: z.string().min(1).optional(),
	profile: z
		.object({
			avatar_url: z.string().url().optional(),
			phone: z.string().optional(),
			address: z
				.object({
					street: z.string(),
					city: z.string(),
					state: z.string().optional(),
					postal_code: z.string().optional(),
					country: z.string()
				})
				.optional(),
			date_of_birth: z.string().datetime().optional(),
			preferences: z
				.object({
					language: z.string().optional(),
					timezone: z.string().optional(),
					currency: z.string().optional(),
					notifications: z
						.object({
							email: z.boolean().optional(),
							sms: z.boolean().optional(),
							push: z.boolean().optional()
						})
						.optional()
				})
				.optional()
		})
		.optional()
});

// Schema for PIN login
export const pinLoginSchema = z.object({
	pin: z.string().min(4).max(8).regex(/^\d+$/, 'PIN must contain only numbers')
});

// Schema for change password (authenticated user)
export const changePasswordSchema = z
	.object({
		current_password: z.string().min(1),
		new_password: z.string().min(8),
		confirm_password: z.string().min(8)
	})
	.refine((data) => data.new_password === data.confirm_password, {
		message: "Passwords don't match",
		path: ['confirm_password']
	});

// Schema for two-factor authentication setup
export const twoFactorSetupSchema = z.object({
	secret: z.string(),
	qr_code: z.string(),
	backup_codes: z.array(z.string())
});

// Schema for two-factor authentication verification
export const twoFactorVerifySchema = z.object({
	code: z.string().length(6),
	backup_code: z.string().optional()
});

// Schema for auth activity log
export const authActivitySchema = z.object({
	id: z.string(),
	user_id: z.string(),
	action: z.enum([
		'login',
		'logout',
		'password_change',
		'password_reset',
		'email_verification',
		'profile_update',
		'failed_login',
		'pin_login',
		'failed_pin_login',
		'staff_mode_toggle'
	]),
	ip_address: z.string().optional(),
	user_agent: z.string().optional(),
	location: z
		.object({
			country: z.string().optional(),
			city: z.string().optional(),
			region: z.string().optional()
		})
		.optional(),
	success: z.boolean(),
	error_message: z.string().optional(),
	created_at: z.string().datetime()
});

// Schema for auth statistics
export const authStatsSchema = z.object({
	total_users: z.number(),
	active_sessions: z.number(),
	login_attempts_today: z.number(),
	successful_logins_today: z.number(),
	failed_logins_today: z.number(),
	new_registrations_today: z.number(),
	password_resets_today: z.number(),
	email_verifications_pending: z.number(),
	two_factor_enabled_users: z.number(),
	recent_activities: z.array(authActivitySchema).optional()
});

// Schema for session management
export const sessionManagementSchema = z.object({
	session_id: z.string(),
	user_id: z.string(),
	device_info: z
		.object({
			device_type: z.string().optional(),
			browser: z.string().optional(),
			os: z.string().optional(),
			ip_address: z.string().optional()
		})
		.optional(),
	is_current: z.boolean(),
	created_at: z.string().datetime(),
	last_activity: z.string().datetime(),
	expires_at: z.string().datetime()
});

// Export inferred types
export type Login = z.infer<typeof loginSchema>;
export type Register = z.infer<typeof registerSchema>;
export type PasswordResetRequest = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirm = z.infer<typeof passwordResetConfirmSchema>;
export type EmailVerification = z.infer<typeof emailVerificationSchema>;
export type PinLogin = z.infer<typeof pinLoginSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type ChangePassword = z.infer<typeof changePasswordSchema>;
export type TwoFactorSetup = z.infer<typeof twoFactorSetupSchema>;
export type TwoFactorVerify = z.infer<typeof twoFactorVerifySchema>;
export type AuthActivity = z.infer<typeof authActivitySchema>;
export type AuthStats = z.infer<typeof authStatsSchema>;
export type SessionManagement = z.infer<typeof sessionManagementSchema>;
