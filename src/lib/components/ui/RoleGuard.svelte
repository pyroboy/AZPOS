<!-- Agent: agent_coder | File: RoleGuard.svelte | Last Updated: 2025-07-28T10:41:46+08:00 -->
<script lang="ts">
	import { authStore } from '$lib/stores/auth.svelte';
import type { AuthUser } from '$lib/types/auth.schema';

// Define UserRole type inline since it's not exported from auth hook
type UserRole = AuthUser['role'];

	// Modern Svelte 5 auth store

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
		if (!authStore.user) return false;

		const userRole = authStore.user.role;
		return roles.includes(userRole);
	});

	// Check if user has required permissions
	let hasRequiredPermissions = $derived(() => {
		if (permissions.length === 0) return true;

		return permissions.every((permission) => {
			return authStore.hasPermission(permission);
		});
	});

	// Check if staff mode is required and active
	let staffModeCheck = $derived(() => {
		if (!requireStaffMode) return true;
		return authStore.isStaffMode;
	});

	// Check if authentication is required
	let authCheck = $derived(() => {
		if (!requireAuthentication) return true;
		return authStore.isAuthenticated;
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
