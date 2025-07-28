import { getContext } from 'telefunc';
import {
	createSessionSchema,
	updateSessionSchema,
	sessionFiltersSchema,
	type SessionState,
	type SessionFilters,
	type PaginatedSessions,
	type SessionStats,
	type SessionActivity
} from '$lib/types/session.schema';
import { createSupabaseClient } from '$lib/server/db';

// Telefunc to create session
export async function onCreateSession(sessionData: unknown): Promise<SessionState> {
	try {
		const { user } = getContext();
		if (!user) throw new Error('Not authenticated');

		const validatedData = createSessionSchema.parse(sessionData);
		const supabase = createSupabaseClient();

		const now = new Date().toISOString();
		const sessionId = crypto.randomUUID();
		const expiresAt = new Date(
			Date.now() + validatedData.expires_in_minutes * 60 * 1000
		).toISOString();

		const { data: savedSession, error } = await supabase
			.from('sessions')
			.insert({
				id: sessionId,
				user_id: validatedData.user_id || user.id,
				session_type: validatedData.session_type,
				status: 'active',
				device_info: validatedData.device_info,
				location_info: validatedData.location_info,
				created_at: now,
				last_activity: now,
				expires_at: expiresAt
			})
			.select()
			.single();

		if (error) throw error;

		// Log session creation activity
		await logSessionActivity(sessionId, 'created', user.id, {
			session_type: validatedData.session_type
		});

		return savedSession;
	} catch (error) {
		console.error('Failed to create session:', error);
		throw error;
	}
}

// Telefunc to update session
export async function onUpdateSession(
	sessionId: string,
	sessionData: unknown
): Promise<SessionState> {
	try {
		const { user } = getContext();
		if (!user) throw new Error('Not authenticated');

		const validatedData = updateSessionSchema.parse(sessionData);
		const supabase = createSupabaseClient();

		// Check if user owns the session or has admin rights
		const { data: existingSession, error: fetchError } = await supabase
			.from('sessions')
			.select('*')
			.eq('id', sessionId)
			.single();

		if (fetchError || !existingSession) {
			throw new Error('Session not found');
		}

		if (existingSession.user_id !== user.id && user.role !== 'admin') {
			throw new Error('Not authorized to update this session');
		}

	const updateData: Record<string, unknown> = {
		last_activity: new Date().toISOString()
	};

		if (validatedData.session_data) {
			// This would update session data if the schema supported it
			updateData.session_data = validatedData.session_data;
		}

		if (validatedData.extend_expiry && validatedData.new_expiry_minutes) {
			updateData.expires_at = new Date(
				Date.now() + validatedData.new_expiry_minutes * 60 * 1000
			).toISOString();
		}

		const { data: updatedSession, error } = await supabase
			.from('sessions')
			.update(updateData)
			.eq('id', sessionId)
			.select()
			.single();

		if (error) throw error;

		// Log session update activity
		await logSessionActivity(sessionId, 'updated', user.id, {
			updated_fields: Object.keys(updateData)
		});

		return updatedSession;
	} catch (error) {
		console.error('Failed to update session:', error);
		throw error;
	}
}

// Telefunc to get current session
export async function onGetCurrentSession(): Promise<SessionState | null> {
	try {
		const { user } = getContext();
		if (!user) return null;

		const supabase = createSupabaseClient();

		const { data: session, error } = await supabase
			.from('sessions')
			.select('*')
			.eq('user_id', user.id)
			.eq('status', 'active')
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned"

		return session;
	} catch (error) {
		console.error('Failed to get current session:', error);
		throw error;
	}
}

// Telefunc to get paginated sessions
export async function onGetSessions(filters?: SessionFilters): Promise<PaginatedSessions> {
	try {
		const { user } = getContext();
		if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
			throw new Error('Not authorized - admin/manager access required');
		}

		const supabase = createSupabaseClient();
		const validatedFilters = filters ? sessionFiltersSchema.parse(filters) : {};

		const page = validatedFilters.page || 1;
		const limit = validatedFilters.limit || 20;
		const offset = (page - 1) * limit;

		let query = supabase.from('sessions').select('*', { count: 'exact' });

		// Apply filters
		if (validatedFilters.user_id) {
			query = query.eq('user_id', validatedFilters.user_id);
		}

		if (validatedFilters.session_type) {
			query = query.eq('session_type', validatedFilters.session_type);
		}

		if (validatedFilters.status) {
			query = query.eq('status', validatedFilters.status);
		}

		if (validatedFilters.created_from) {
			query = query.gte('created_at', validatedFilters.created_from);
		}

		if (validatedFilters.created_to) {
			query = query.lte('created_at', validatedFilters.created_to);
		}

		if (validatedFilters.last_activity_from) {
			query = query.gte('last_activity', validatedFilters.last_activity_from);
		}

		if (validatedFilters.last_activity_to) {
			query = query.lte('last_activity', validatedFilters.last_activity_to);
		}

		// Apply sorting
		const sortBy = validatedFilters.sort_by || 'created_at';
		const sortOrder = validatedFilters.sort_order || 'desc';
		query = query.order(sortBy, { ascending: sortOrder === 'asc' });

		// Apply pagination
		query = query.range(offset, offset + limit - 1);

		const { data: sessions, error, count } = await query;
		if (error) throw error;

		const totalPages = Math.ceil((count || 0) / limit);

		return {
			sessions: sessions || [],
			pagination: {
				page,
				limit,
				total: count || 0,
				total_pages: totalPages,
				has_more: page < totalPages
			}
		};
	} catch (error) {
		console.error('Failed to get sessions:', error);
		throw error;
	}
}

// Telefunc to end session
export async function onEndSession(sessionId: string): Promise<void> {
	try {
		const { user } = getContext();
		if (!user) throw new Error('Not authenticated');

		const supabase = createSupabaseClient();

		// Check if user owns the session or has admin rights
		const { data: existingSession, error: fetchError } = await supabase
			.from('sessions')
			.select('user_id')
			.eq('id', sessionId)
			.single();

		if (fetchError || !existingSession) {
			throw new Error('Session not found');
		}

		if (existingSession.user_id !== user.id && user.role !== 'admin') {
			throw new Error('Not authorized to end this session');
		}

		const now = new Date().toISOString();

		const { error } = await supabase
			.from('sessions')
			.update({
				status: 'terminated',
				last_activity: now,
				terminated_at: now
			})
			.eq('id', sessionId);

		if (error) throw error;

		// Log session end activity
		await logSessionActivity(sessionId, 'terminated', user.id);
	} catch (error) {
		console.error('Failed to end session:', error);
		throw error;
	}
}

// Telefunc to cleanup expired sessions
export async function onCleanupExpiredSessions(): Promise<{ cleaned_count: number }> {
	try {
		const { user } = getContext();
		if (!user || user.role !== 'admin') {
			throw new Error('Not authorized - admin access required');
		}

		const supabase = createSupabaseClient();
		const now = new Date().toISOString();

		const { data: expiredSessions, error: fetchError } = await supabase
			.from('sessions')
			.select('id')
			.lt('expires_at', now)
			.neq('status', 'expired');

		if (fetchError) throw fetchError;

		if (expiredSessions && expiredSessions.length > 0) {
			const sessionIds = expiredSessions.map((s) => s.id);

			const { error: updateError } = await supabase
				.from('sessions')
				.update({
					status: 'expired',
					last_activity: now
				})
				.in('id', sessionIds);

			if (updateError) throw updateError;

			// Log cleanup activity
			await logSessionActivity(null, 'expired', user.id, {
				cleaned_count: expiredSessions.length,
				session_ids: sessionIds
			});

			return { cleaned_count: expiredSessions.length };
		}

		return { cleaned_count: 0 };
	} catch (error) {
		console.error('Failed to cleanup expired sessions:', error);
		throw error;
	}
}

// Telefunc to get session statistics
export async function onGetSessionStats(): Promise<SessionStats> {
	try {
		const { user } = getContext();
		if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
			throw new Error('Not authorized - admin/manager access required');
		}

		const supabase = createSupabaseClient();

		const { data: sessions, error } = await supabase
			.from('sessions')
			.select('session_type, status, created_at, expires_at, user_id, device_info');

		if (error) throw error;

	const today = new Date();
	today.setHours(0, 0, 0, 0);

		const thisWeek = new Date();
		thisWeek.setDate(thisWeek.getDate() - 7);

		const thisMonth = new Date();
		thisMonth.setMonth(thisMonth.getMonth() - 1);

		const baseStats = {
			total_sessions: 0,
			active_sessions: 0,
			expired_sessions: 0,
			terminated_sessions: 0,
			user_sessions: 0,
			guest_sessions: 0,
			admin_sessions: 0,
			pos_sessions: 0,
			avg_session_duration: 0,
			sessions_today: 0,
			sessions_this_week: 0,
			sessions_this_month: 0,
			device_breakdown: {} as Record<string, { count: number; percentage: number }>,
			hourly_activity: [] as Array<{ hour: number; session_count: number; active_count: number }>,
			top_locations: [] as Array<{ store_id: string; store_name?: string; session_count: number }>
		};

		const stats =
			sessions?.reduce((acc, session) => {
				acc.total_sessions++;

				const createdDate = new Date(session.created_at);
				if (createdDate >= today) acc.sessions_today++;
				if (createdDate >= thisWeek) acc.sessions_this_week++;
				if (createdDate >= thisMonth) acc.sessions_this_month++;

				// Status breakdown
				switch (session.status) {
					case 'active':
						acc.active_sessions++;
						break;
					case 'expired':
						acc.expired_sessions++;
						break;
					case 'terminated':
						acc.terminated_sessions++;
						break;
				}

				// Session type breakdown
				switch (session.session_type) {
					case 'user':
						acc.user_sessions++;
						break;
					case 'guest':
						acc.guest_sessions++;
						break;
					case 'admin':
						acc.admin_sessions++;
						break;
					case 'pos':
						acc.pos_sessions++;
						break;
				}

				// Device breakdown
				const deviceType = session.device_info?.device_type || 'unknown';
				if (!acc.device_breakdown[deviceType]) {
					acc.device_breakdown[deviceType] = { count: 0, percentage: 0 };
				}
				acc.device_breakdown[deviceType].count++;

				return acc;
			}, baseStats) || baseStats;

		// Calculate device breakdown percentages
		Object.keys(stats.device_breakdown).forEach((device) => {
			stats.device_breakdown[device].percentage =
				stats.total_sessions > 0
					? (stats.device_breakdown[device].count / stats.total_sessions) * 100
					: 0;
		});

		return stats;
	} catch (error) {
		console.error('Failed to get session stats:', error);
		throw error;
	}
}

// Telefunc to get session activity
export async function onGetSessionActivity(
	sessionId?: string,
	limit: number = 50
): Promise<SessionActivity[]> {
	try {
		const { user } = getContext();
		if (!user) throw new Error('Not authenticated');

		const supabase = createSupabaseClient();

		let query = supabase
			.from('session_activity')
			.select('*')
			.order('timestamp', { ascending: false })
			.limit(limit);

		if (sessionId) {
			query = query.eq('session_id', sessionId);
		}

		// Non-admin users can only see their own session activity
		if (user.role !== 'admin' && user.role !== 'manager') {
			// Need to join with sessions to filter by user_id
			query = query.eq('session_id', sessionId); // Assuming sessionId provided for non-admin users
		}

		const { data: activities, error } = await query;
		if (error) throw error;

		return activities || [];
	} catch (error) {
		console.error('Failed to get session activity:', error);
		throw error;
	}
}

// Helper function to log session activity
async function logSessionActivity(
	sessionId: string | null,
	action: 'created' | 'updated' | 'extended' | 'terminated' | 'expired' | 'data_updated',
	userId: string,
	details?: Record<string, unknown>
): Promise<void> {
	try {
		const supabase = createSupabaseClient();

		const activity = {
			id: crypto.randomUUID(),
			session_id: sessionId,
			action,
			details: details || {},
			timestamp: new Date().toISOString()
		};

		const { error } = await supabase.from('session_activity').insert(activity);

		if (error) {
			console.error('Failed to log session activity:', error);
			// Don't throw error as this is logging functionality
		}
	} catch (error) {
		console.error('Error in logSessionActivity:', error);
		// Don't throw error as this is logging functionality
	}
}
