# PIN Authentication Implementation

This document describes the PIN-based authentication telefuncs that have been implemented for staff authentication in the AZPOS system.

## Overview

The PIN authentication system provides a server-centric approach to staff authentication that maintains compatibility with the legacy authStore's PIN authentication while following the telefunc pattern.

## Implemented Functions

### 1. `onLoginWithPin(pin: string): Promise<AuthSession>`

Authenticates staff users using their PIN instead of email/password.

**Features:**

- Validates PIN format (4-8 digits)
- Hashes PIN using SHA-256 for secure comparison
- Searches through all active staff users with PINs
- Creates server-side session without Supabase Auth tokens
- Logs authentication attempts (both successful and failed)
- Updates user's last activity timestamp

**Usage:**

```typescript
import { onLoginWithPin } from '$lib/server/telefuncs/auth.telefunc';

const session = await onLoginWithPin({ pin: '1234' });
```

### 2. `onToggleStaffMode(): Promise<{ isStaffMode: boolean; user: AuthUser }>`

Toggles between staff and customer mode for authenticated users.

**Features:**

- Validates user is authenticated
- Ensures only staff members can toggle staff mode
- Logs staff mode toggle activity
- Returns updated user data

**Usage:**

```typescript
import { onToggleStaffMode } from '$lib/server/telefuncs/auth.telefunc';

const result = await onToggleStaffMode();
```

## Database Schema Compatibility

The implementation works with the existing users table structure:

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  username TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'owner', 'manager', 'cashier', 'staff')),
  pin_hash TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### Key Fields:

- `pin_hash`: Stores SHA-256 hashed PIN for staff authentication
- `username`: Used to create synthetic email addresses for compatibility
- `role`: Staff role that determines permissions

## Security Features

1. **PIN Hashing**: PINs are hashed using SHA-256 before storage and comparison
2. **Input Validation**: PIN format is validated (4-8 digits only)
3. **Activity Logging**: All authentication attempts are logged to `auth_activities` table
4. **Role-based Access**: Only staff roles can use PIN authentication
5. **Session Management**: Creates temporary session tokens for PIN-based sessions

## Schema Updates

Added the following schemas to `auth.schema.ts`:

### PIN Login Schema

```typescript
export const pinLoginSchema = z.object({
	pin: z.string().min(4).max(8).regex(/^\d+$/, 'PIN must contain only numbers')
});
```

### Activity Log Extensions

Extended the auth activity log to include:

- `pin_login`: Successful PIN authentication
- `failed_pin_login`: Failed PIN authentication attempt
- `staff_mode_toggle`: Staff mode toggle action

## Compatibility with Legacy AuthStore

The implementation maintains compatibility with the existing authStore patterns:

1. **Role Mapping**: Maps database `staff` role to `cashier` for consistency
2. **Synthetic Emails**: Creates email addresses in format `username@local.pos`
3. **Permission Structure**: Compatible with existing permission checking
4. **Session Format**: Returns AuthSession objects compatible with existing code

## Usage Example

```typescript
// PIN Authentication
try {
	const session = await onLoginWithPin({ pin: '1234' });
	console.log(`Authenticated user: ${session.user.full_name}`);
	console.log(`Role: ${session.user.role}`);
} catch (error) {
	console.error('PIN authentication failed:', error.message);
}

// Staff Mode Toggle
try {
	const result = await onToggleStaffMode();
	console.log(`Staff mode: ${result.isStaffMode}`);
	console.log(`User: ${result.user.full_name}`);
} catch (error) {
	console.error('Staff mode toggle failed:', error.message);
}
```

## Database Migration Notes

To add PIN support to existing users, you would run:

```sql
-- Add PIN hash for a staff member (example with hashed PIN "1234")
UPDATE users
SET pin_hash = 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'
WHERE username = 'staff_member';
```

Note: The PIN hash above is SHA-256 of "1234". In production, use a proper PIN hashing utility.

## Error Handling

The functions provide comprehensive error handling:

- Invalid PIN format → Validation error
- Incorrect PIN → "Invalid PIN" error
- No staff users with PINs → "Invalid PIN" error
- Non-staff user trying to toggle staff mode → Authorization error
- Database errors → Propagated with meaningful messages

## Future Enhancements

Potential improvements could include:

1. **PIN Complexity Requirements**: Enforce stronger PIN requirements
2. **Rate Limiting**: Implement PIN authentication rate limiting
3. **PIN Expiration**: Add PIN expiration functionality
4. **Audit Trail**: Enhanced audit logging for security compliance
5. **Multi-factor**: Additional authentication factors for sensitive operations

## Testing

To test the PIN authentication:

1. Ensure users table has records with `pin_hash` values
2. Use the telefunc functions from client-side code
3. Check `auth_activities` table for proper logging
4. Verify session creation and user data consistency
