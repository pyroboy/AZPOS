import { getContext } from 'telefunc';
import { 
  sessionCreationSchema,
  sessionUpdateSchema,
  sessionFiltersSchema,
  type SessionState,
  type SessionCreation,
  type SessionUpdate,
  type SessionFilters,
  type PaginatedSessions,
  type SessionStats,
  type SessionActivity
} from '$lib/types/session.schema';
import { createSupabaseClient } from '$lib/server/db';

// Telefunc to create session
export async function onCreateSession(sessionData: unknown): Promise<SessionState> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const validatedData = sessionCreationSchema.parse(sessionData);
  const supabase = createSupabaseClient();

  const now = new Date().toISOString();
  const sessionId = crypto.randomUUID();

  const newSession: SessionState = {
    id: sessionId,
    user_id: user.id,
    session_type: validatedData.session_type,
    status: 'active',
    data: validatedData.data || {},
    metadata: {
      device_info: validatedData.metadata?.device_info,
      location: validatedData.metadata?.location,
      ip_address: validatedData.metadata?.ip_address,
      user_agent: validatedData.metadata?.user_agent
    },
    created_at: now,
    updated_at: now,
    expires_at: validatedData.expires_at
  };

  const { data: savedSession, error } = await supabase
    .from('sessions')
    .insert({
      id: newSession.id,
      user_id: newSession.user_id,
      session_type: newSession.session_type,
      status: newSession.status,
      data: newSession.data,
      metadata: newSession.metadata,
      created_at: newSession.created_at,
      updated_at: newSession.updated_at,
      expires_at: newSession.expires_at
    })
    .select()
    .single();

  if (error) throw error;

  // Log session creation activity
  await logSessionActivity(sessionId, 'session_created', user.id, {
    session_type: validatedData.session_type
  });

  return newSession;
}

// Telefunc to update session
export async function onUpdateSession(sessionId: string, sessionData: unknown): Promise<SessionState> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const validatedData = sessionUpdateSchema.parse(sessionData);
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

  const now = new Date().toISOString();

  const updateData: any = {
    updated_at: now
  };

  if (validatedData.status) updateData.status = validatedData.status;
  if (validatedData.data) updateData.data = { ...existingSession.data, ...validatedData.data };
  if (validatedData.metadata) updateData.metadata = { ...existingSession.metadata, ...validatedData.metadata };
  if (validatedData.expires_at) updateData.expires_at = validatedData.expires_at;

  const { data: updatedSession, error } = await supabase
    .from('sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;

  // Log session update activity
  await logSessionActivity(sessionId, 'session_updated', user.id, {
    updated_fields: Object.keys(validatedData)
  });

  return updatedSession;
}

// Telefunc to get current session
export async function onGetCurrentSession(): Promise<SessionState | null> {
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
}

// Telefunc to get paginated sessions
export async function onGetSessions(filters?: SessionFilters): Promise<PaginatedSessions> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const supabase = createSupabaseClient();
  const validatedFilters = filters ? sessionFiltersSchema.parse(filters) : {};
  
  const page = validatedFilters.page || 1;
  const limit = validatedFilters.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('sessions')
    .select('*', { count: 'exact' });

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

  if (validatedFilters.is_expired !== undefined) {
    const now = new Date().toISOString();
    if (validatedFilters.is_expired) {
      query = query.lt('expires_at', now);
    } else {
      query = query.or(`expires_at.is.null,expires_at.gt.${now}`);
    }
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
}

// Telefunc to end session
export async function onEndSession(sessionId: string): Promise<void> {
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
      status: 'ended',
      updated_at: now,
      ended_at: now
    })
    .eq('id', sessionId);

  if (error) throw error;

  // Log session end activity
  await logSessionActivity(sessionId, 'session_ended', user.id);
}

// Telefunc to cleanup expired sessions
export async function onCleanupExpiredSessions(): Promise<{ cleaned_count: number }> {
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
    const sessionIds = expiredSessions.map(s => s.id);

    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        status: 'expired',
        updated_at: now
      })
      .in('id', sessionIds);

    if (updateError) throw updateError;

    // Log cleanup activity
    await logSessionActivity(null, 'sessions_cleaned', user.id, {
      cleaned_count: expiredSessions.length,
      session_ids: sessionIds
    });

    return { cleaned_count: expiredSessions.length };
  }

  return { cleaned_count: 0 };
}

// Telefunc to get session statistics
export async function onGetSessionStats(): Promise<SessionStats> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const supabase = createSupabaseClient();

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('session_type, status, created_at, expires_at, user_id');

  if (error) throw error;

  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = sessions?.reduce((acc, session) => {
    acc.total_sessions++;
    
    const createdDate = new Date(session.created_at);
    if (createdDate >= today) {
      acc.sessions_today++;
    }
    
    switch (session.status) {
      case 'active':
        acc.active_sessions++;
        break;
      case 'ended':
        acc.ended_sessions++;
        break;
      case 'expired':
        acc.expired_sessions++;
        break;
    }
    
    // Check if session is expired but not marked as such
    if (session.expires_at && new Date(session.expires_at) < now && session.status === 'active') {
      acc.expired_sessions++;
      acc.active_sessions--;
    }
    
    // Session type breakdown
    if (!acc.session_type_breakdown[session.session_type]) {
      acc.session_type_breakdown[session.session_type] = { count: 0, percentage: 0 };
    }
    acc.session_type_breakdown[session.session_type].count++;
    
    return acc;
  }, {
    total_sessions: 0,
    active_sessions: 0,
    ended_sessions: 0,
    expired_sessions: 0,
    sessions_today: 0,
    unique_users_today: 0,
    avg_session_duration_minutes: 0,
    session_type_breakdown: {} as Record<string, any>
  }) || {
    total_sessions: 0,
    active_sessions: 0,
    ended_sessions: 0,
    expired_sessions: 0,
    sessions_today: 0,
    unique_users_today: 0,
    avg_session_duration_minutes: 0,
    session_type_breakdown: {}
  };

  // Calculate unique users today
  const todaysSessions = sessions?.filter(s => {
    const createdDate = new Date(s.created_at);
    return createdDate >= today;
  }) || [];
  
  const uniqueUsersToday = new Set(todaysSessions.map(s => s.user_id));
  stats.unique_users_today = uniqueUsersToday.size;

  // Calculate session type percentages
  Object.keys(stats.session_type_breakdown).forEach(type => {
    stats.session_type_breakdown[type].percentage = 
      stats.total_sessions > 0 ? (stats.session_type_breakdown[type].count / stats.total_sessions) * 100 : 0;
  });

  return stats;
}

// Telefunc to get session activity
export async function onGetSessionActivity(sessionId?: string, limit: number = 50): Promise<SessionActivity[]> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const supabase = createSupabaseClient();

  let query = supabase
    .from('session_activity')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  // Non-admin users can only see their own session activity
  if (user.role !== 'admin' && user.role !== 'manager') {
    query = query.eq('user_id', user.id);
  }

  const { data: activities, error } = await query;
  if (error) throw error;

  return activities || [];
}

// Helper function to log session activity
async function logSessionActivity(
  sessionId: string | null, 
  activity_type: string, 
  userId: string, 
  details?: any
): Promise<void> {
  const supabase = createSupabaseClient();

  const activity = {
    id: crypto.randomUUID(),
    session_id: sessionId,
    user_id: userId,
    activity_type,
    details: details || {},
    created_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('session_activity')
    .insert(activity);

  if (error) {
    console.error('Failed to log session activity:', error);
    // Don't throw error as this is logging functionality
  }
}
