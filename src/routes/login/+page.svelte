<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Select, Content, Item, Trigger } from '$lib/components/ui/select';
	import type { ActionData, PageData } from './$types';
	import { Badge } from '$lib/components/ui/badge';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	const users = data.users ?? [];
	let selectedUsername = $state<string | undefined>(undefined);

	const selectedUser = $derived(users.find((u) => u.username === selectedUsername));
	const selectedLabel = $derived(selectedUser?.full_name ?? 'Select a user');
	const selectedRole = $derived(selectedUser?.role);

</script>

<div class="min-h-screen bg-muted/40 flex items-center justify-center p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header class="text-center">
			<Card.Title class="text-2xl">AZPOS – Sign In</Card.Title>
			<Card.Description>Select your user profile to continue.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/login" class="grid gap-4">
				<div class="grid gap-2">
					<Label for="username">User Profile</Label>
					<Select name="username" bind:value={selectedUsername} type="single">
						<Trigger class="w-full">{selectedLabel}</Trigger>
						<Content>
							{#each users as user (user.id)}
								<Item value={user.username} label={user.full_name}>
									<div class="flex items-center justify-between w-full">
										<span>{user.full_name}</span>
										<Badge variant="secondary" class="capitalize">{user.role}</Badge>
									</div>
								</Item>
							{/each}
						</Content>
					</Select>
					{#if selectedRole}
						<p class="text-sm text-muted-foreground mt-1">
							Role: <span class="font-semibold capitalize">{selectedRole}</span>
						</p>
					{/if}
				</div>

				{#if form?.error}
					<p class="text-sm font-medium text-destructive">{form.error}</p>
				{/if}

				<Button type="submit" class="w-full" disabled={!selectedUsername}>
					Sign In →
				</Button>
			</form>
		</Card.Content>
		<Card.Footer>
			<p class="text-xs text-muted-foreground text-center w-full">
				Logout is available from the user menu on any page.
			</p>
		</Card.Footer>
	</Card.Root>
</div>
