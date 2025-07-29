import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import { browser } from '$app/environment';
import type {
	SessionState,
	SessionFilters,
	PaginatedSessions,
	SessionStats,
	SessionActivity
} from '$lib/types/session.schema';

// Dynamic import wrappers for Telefunc functions (avoids SSR import issues)
const onCreateSession = async (sessionData: Record<string, unknown>): Promise<SessionState> => {
	const { onCreateSession } = await import('$lib/server/telefuncs/session.telefunc');
	return onCreateSession(sessionData);
};

const onUpdateSession = async (sessionId: string, sessionData: Record<string, unknown>): Promise<SessionState> => {
	const { onUpdateSession } = await import('$lib/server/telefuncs/session.telefunc');
	return onUpdateSession(sessionId, sessionData);
};

const onGetCurrentSession = async (): Promise<SessionState | null> => {
	const { onGetCurrentSession } = await import('$lib/server/telefuncs/session.telefunc');
	return onGetCurrentSession();
};

const onGetSessions = async (filters?: SessionFilters): Promise<PaginatedSessions> => {
	const { onGetSessions } = await import('$lib/server/telefuncs/session.telefunc');
	return onGetSessions(filters);
};

const onEndSession = async (sessionId: string): Promise<void> => {
	const { onEndSession } = await import('$lib/server/telefuncs/session.telefunc');
	return onEndSession(sessionId);
};

const onCleanupExpiredSessions = async (): Promise<{ cleaned_count: number }> => {
	const { onCleanupExpiredSessions } = await import('$lib/server/telefuncs/session.telefunc');
	return onCleanupExpiredSessions();
};

const onGetSessionStats = async (): Promise<SessionStats> => {
	const { onGetSessionStats } = await import('$lib/server/telefuncs/session.telefunc');
	return onGetSessionStats();
};

const onGetSessionActivity = async (sessionId?: string, limit?: number): Promise<SessionActivity[]> => {
	const { onGetSessionActivity } = await import('$lib/server/telefuncs/session.telefunc');
	return onGetSessionActivity(sessionId, limit);
};

const sessionsQueryKey = ['sessions'];
const currentSessionQueryKey = ['current-session'];
const sessionStatsQueryKey = ['session-stats'];
const sessionActivityQueryKey = ['session-activity'];

export function useSessions() {
	const queryClient = useQueryClient();

	// State for filters
	let filters = $state<SessionFilters>({
		page: 1,
		limit: 20,
		sort_by: 'created_at',
		sort_order: 'desc'
	});

	// Query for current session
	const currentSessionQuery = createQuery<SessionState | null>({
		queryKey: currentSessionQueryKey,
		queryFn: onGetCurrentSession,
		staleTime: 30 * 1000, // 30 seconds
		enabled: browser
	});

	// Query for paginated sessions
	const sessionsQuery = createQuery<PaginatedSessions>({
		queryKey: $derived([...sessionsQueryKey, filters]),
		queryFn: () => onGetSessions(filters),
		enabled: browser
	});

	// Query for session statistics
	const statsQuery = createQuery<SessionStats>({
		queryKey: sessionStatsQueryKey,
		queryFn: () => onGetSessionStats(),
		enabled: browser
	});

	// Mutation to create session
	const createSessionMutation = createMutation({
	mutationFn: (sessionData: Record<string, unknown>) => onCreateSession(sessionData),
		onSuccess: (newSession) => {
			// Update current session
			queryClient.setQueryData(currentSessionQueryKey, newSession);

			// Invalidate sessions list and stats
			queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
			queryClient.invalidateQueries({ queryKey: sessionStatsQueryKey });
		}
	});

	// Mutation to update session
	const updateSessionMutation = createMutation({
		mutationFn: ({ sessionId, sessionData }: { sessionId: string; sessionData: Record<string, unknown> }) =>
			onUpdateSession(sessionId, sessionData),
		onSuccess: (updatedSession) => {
			// Update current session if it's the same
			const currentSession = queryClient.getQueryData<SessionState>(currentSessionQueryKey);
			if (currentSession?.id === updatedSession.id) {
				queryClient.setQueryData(currentSessionQueryKey, updatedSession);
			}

			// Invalidate sessions list
			queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
		}
	});

	// Mutation to end session
	const endSessionMutation = createMutation({
		mutationFn: (sessionId: string) => onEndSession(sessionId),
		onSuccess: (_, sessionId) => {
			// Clear current session if it's the same
			const currentSession = queryClient.getQueryData<SessionState>(currentSessionQueryKey);
			if (currentSession?.id === sessionId) {
				queryClient.setQueryData(currentSessionQueryKey, null);
			}

			// Invalidate sessions list and stats
			queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
			queryClient.invalidateQueries({ queryKey: sessionStatsQueryKey });
		}
	});

	// Mutation to cleanup expired sessions
	const cleanupExpiredMutation = createMutation({
		mutationFn: onCleanupExpiredSessions,
		onSuccess: () => {
			// Invalidate sessions list and stats
			queryClient.invalidateQueries({ queryKey: sessionsQueryKey });
			queryClient.invalidateQueries({ queryKey: sessionStatsQueryKey });
		}
	});

	// Derived reactive state
	const currentSession = $derived(currentSessionQuery.data);
	const sessions = $derived(sessionsQuery.data?.sessions || []);
	const pagination = $derived(sessionsQuery.data?.pagination);
	const stats = $derived(statsQuery.data);

	// Session status checks
	const hasActiveSession = $derived(!!currentSession && currentSession.status === 'active');
	const isSessionExpired = $derived(() => {
		if (!currentSession?.expires_at) return false;
		return new Date(currentSession.expires_at) < new Date();
	});

	// Filtered sessions
	const activeSessions = $derived(sessions.filter((session: SessionState) => session.status === 'active'));

	const endedSessions = $derived(sessions.filter((session: SessionState) => session.status === 'terminated'));

	const expiredSessions = $derived(sessions.filter((session: SessionState) => session.status === 'expired'));

	const todaysSessions = $derived(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return sessions.filter((session: SessionState) => {
			const sessionDate = new Date(session.created_at);
			sessionDate.setHours(0, 0, 0, 0);
			return sessionDate.getTime() === today.getTime();
		});
	});

	// Session type breakdown
	const sessionTypeBreakdown = $derived(() => {
		const breakdown: Record<string, { count: number; percentage: number }> = {};

		sessions.forEach((session: SessionState) => {
			if (!breakdown[session.session_type]) {
				breakdown[session.session_type] = { count: 0, percentage: 0 };
			}
			breakdown[session.session_type].count++;
		});

		// Calculate percentages
		const total = sessions.length;
		Object.keys(breakdown).forEach((type) => {
			breakdown[type].percentage = total > 0 ? (breakdown[type].count / total) * 100 : 0;
		});

		return breakdown;
	});

	// Helper functions
	function updateFilters(newFilters: Partial<SessionFilters>) {
		filters = { ...filters, ...newFilters };
	}

	function resetFilters() {
		filters = {
			page: 1,
			limit: 20,
			sort_by: 'created_at',
			sort_order: 'desc'
		};
	}

	function goToPage(page: number) {
		updateFilters({ page });
	}

	function setUserFilter(user_id: string) {
		updateFilters({ user_id: user_id || undefined, page: 1 });
	}

	function setSessionTypeFilter(session_type: SessionFilters['session_type']) {
		updateFilters({ session_type, page: 1 });
	}

	function setStatusFilter(status: SessionFilters['status']) {
		updateFilters({ status, page: 1 });
	}

	function setExpiredFilter() {
		// Note: is_expired is not part of SessionFilters schema, removing this functionality
		// updateFilters({ is_expired, page: 1 });
		updateFilters({ page: 1 });
	}

	function setDateRange(created_from?: string, created_to?: string) {
		updateFilters({ created_from, created_to, page: 1 });
	}

	function setSorting(
		sort_by: SessionFilters['sort_by'],
		sort_order: SessionFilters['sort_order']
	) {
		updateFilters({ sort_by, sort_order, page: 1 });
	}

	// Session operations
	function createSession(sessionData: Record<string, unknown>) {
		return createSessionMutation.mutateAsync(sessionData);
	}

	function updateSession(sessionId: string, sessionData: Record<string, unknown>) {
		return updateSessionMutation.mutateAsync({ sessionId, sessionData });
	}

	function endSession(sessionId: string) {
		return endSessionMutation.mutateAsync(sessionId);
	}

	function endCurrentSession() {
		if (currentSession) {
			return endSession(currentSession.id);
		}
		throw new Error('No active session to end');
	}

	function cleanupExpiredSessions() {
		return cleanupExpiredMutation.mutateAsync();
	}

	// Session data helpers
	function updateSessionData(data: Record<string, unknown>) {
		if (!currentSession) throw new Error('No active session');
		return updateSession(currentSession.id, { data });
	}

	function getSessionData<T = unknown>(key?: string): T | undefined {
		if (!currentSession?.data) return undefined;
		if (key) return currentSession.data[key] as T;
		return currentSession.data as T;
	}

	function setSessionData(key: string, value: unknown) {
		if (!currentSession) throw new Error('No active session');
		const newData = { ...currentSession.data, [key]: value };
		return updateSessionData(newData);
	}

	function removeSessionData(key: string) {
		if (!currentSession) throw new Error('No active session');
		const newData = { ...currentSession.data };
		delete newData[key];
		return updateSessionData(newData);
	}

	// Session status helpers
	function isSessionActive(session: SessionState): boolean {
		return (
			session.status === 'active' &&
			(!session.expires_at || new Date(session.expires_at) > new Date())
		);
	}

	function isSessionEnded(session: SessionState): boolean {
		return session.status === 'terminated';
	}

	function isSessionExpiredCheck(session: SessionState): boolean {
		return (
			session.status === 'expired' ||
			(!!session.expires_at && new Date(session.expires_at) < new Date())
		);
	}

	function getSessionStatusColor(status: SessionState['status']): string {
		switch (status) {
			case 'active':
				return 'success';
			case 'terminated':
				return 'secondary';
			case 'expired':
				return 'warning';
			default:
				return 'secondary';
		}
	}

	function getSessionDuration(session: SessionState): number {
		const start = new Date(session.created_at);
		const end = session.terminated_at ? new Date(session.terminated_at) : new Date();
		return Math.floor((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
	}

	function formatSessionDuration(session: SessionState): string {
		const minutes = getSessionDuration(session);
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;

		if (hours > 0) {
			return `${hours}h ${remainingMinutes}m`;
		}
		return `${minutes}m`;
	}

	// Activity helper
	function useSessionActivity(sessionId?: string, limit: number = 50) {
		return createQuery<SessionActivity[]>({
			queryKey: [...sessionActivityQueryKey, sessionId, limit],
			queryFn: () => onGetSessionActivity(sessionId, limit),
			enabled: browser
		});
	}

	// Calculate totals for current view
	const currentViewTotals = $derived(() => {
		const total_sessions = sessions.length;
		const active_count = sessions.filter((s: SessionState) => s.status === 'active').length;
		const ended_count = sessions.filter((s: SessionState) => s.status === 'terminated').length;
		const expired_count = sessions.filter((s: SessionState) => s.status === 'expired').length;

		const total_duration = sessions.reduce((sum: number, s: SessionState) => sum + getSessionDuration(s), 0);
		const avg_duration = total_sessions > 0 ? total_duration / total_sessions : 0;

		return {
			total_sessions,
			active_count,
			ended_count,
			expired_count,
			avg_duration_minutes: avg_duration
		};
	});

	return {
		// Queries and their states
		currentSessionQuery,
		sessionsQuery,
		statsQuery,

		// Reactive data
		currentSession,
		sessions,
		pagination,
		stats,

		// Session status
		hasActiveSession,
		isSessionExpired,

		// Filtered data
		activeSessions,
		endedSessions,
		expiredSessions,
		todaysSessions,

		// Calculated data
		sessionTypeBreakdown,
		currentViewTotals,

		// Current filters
		filters: $derived(filters),

		// Mutations
		createSession,
		updateSession,
		endSession,
		endCurrentSession,
		cleanupExpiredSessions,

		// Session data operations
		updateSessionData,
		getSessionData,
		setSessionData,
		removeSessionData,

		// Filter helpers
		updateFilters,
		resetFilters,
		goToPage,
		setUserFilter,
		setSessionTypeFilter,
		setStatusFilter,
		setExpiredFilter,
		setDateRange,
		setSorting,

		// Session helpers
		isSessionActive,
		isSessionEnded,
		isSessionExpiredCheck,
		getSessionStatusColor,
		getSessionDuration,
		formatSessionDuration,

		// Activity helper
		useSessionActivity,

		// Mutation states
		createSessionStatus: $derived(createSessionMutation.status),
		updateSessionStatus: $derived(updateSessionMutation.status),
		endSessionStatus: $derived(endSessionMutation.status),
		cleanupStatus: $derived(cleanupExpiredMutation.status),

		// Loading states
		isLoading: $derived(currentSessionQuery.isPending),
		isSessionsLoading: $derived(sessionsQuery.isPending),
		isError: $derived(currentSessionQuery.isError),
		error: $derived(currentSessionQuery.error),

		// Stats loading
		isStatsLoading: $derived(statsQuery.isPending),
		statsError: $derived(statsQuery.error)
	};
}
