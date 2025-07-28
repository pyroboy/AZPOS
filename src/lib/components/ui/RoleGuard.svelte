<!-- Agent: agent_coder | File: RoleGuard.svelte | Last Updated: 2025-07-28T10:41:46+08:00 -->
<script lang="ts">
	import { useAuth } from '$lib/data/auth';
	import type { UserRole } from '$lib/stores/authStore.svelte';

	// Initialize auth hook
	const auth = useAuth();

	// Props
	let {
		roles = [] as UserRole[],
		permissions = [] as string[],
		requireStaffMode = false,
		requireAuthentication = false,
		fallback = null,
		children
	} = $props();

	// Check if user has required role
	let hasRequiredRole = $derived(() => {
		if (roles.length === 0) return true;

		const userRole = auth.user.role;
		return roles.includes(userRole);
	});

	// Check if user has required permissions
	let hasRequiredPermissions = $derived(() => {
		if (permissions.length === 0) return true;

		return permissions.every((permission) => {
			return auth.hasPermission(permission);
		});
	});

	// Check if staff mode is required and active
	let staffModeCheck = $derived(() => {
		if (!requireStaffMode) return true;
		return auth.isStaffMode;
	});

	// Check if authentication is required
	let authCheck = $derived(() => {
		if (!requireAuthentication) return true;
		return auth.isAuthenticated;
	});

	// Final access check
	let hasAccess = $derived(() => {
		return hasRequiredRole() && hasRequiredPermissions() && staffModeCheck() && authCheck();
	});
</script>

{#if hasAccess()}
	{@render children()}
{:else if fallback}
	{@render fallback()}
{/if}
