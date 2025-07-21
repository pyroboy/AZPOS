<script lang="ts">
	import { users } from '$lib/stores/userStore';
	import type { Role, User } from '$lib/schemas/models';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';

	let { open = $bindable(), onSuccess, requiredRole = 'manager' }: {
		open?: boolean;
		onSuccess: (user: User) => void;
		requiredRole?: Role | Role[];
	} = $props();

	let pin = $state('');
	let error = $state('');

	function verifyPin() {
		error = '';
		const allUsers = $users;
		const rolesToCheck = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

		const matchingUser = allUsers.find(
			(u) => u.pin_hash === pin && u.is_active && rolesToCheck.includes(u.role)
		);

		if (matchingUser) {
			onSuccess(matchingUser);
			pin = '';
			open = false;
		} else {
			error = 'Invalid PIN or insufficient permissions.';
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Manager Approval Required</Dialog.Title>
			<Dialog.Description>Enter a manager's PIN to proceed.</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-4 items-center gap-4">
				<Label for="pin" class="text-right">PIN</Label>
				<Input id="pin" type="password" bind:value={pin} class="col-span-3" />
			</div>
			{#if error}
				<p class="text-sm text-destructive text-center">{error}</p>
			{/if}
		</div>
		<Dialog.Footer>
			<Button onclick={verifyPin}>Authorize</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
