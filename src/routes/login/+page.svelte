<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import {
		Select,
		Content,
		Item,
		Trigger
	} from '$lib/components/ui/select';
	import type { ActionData, PageData } from './$types';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	// Get a unique list of active usernames from the data
	const usernames = [...new Set(data.usernames)] as string[];
	let selectedUsername = $state<string | undefined>(undefined);

	// Create a derived label
	const selectedLabel = $derived(selectedUsername ?? "Select a user");

</script>

<div class="min-h-screen bg-muted/40 flex items-center justify-center">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title class="text-2xl">Login</Card.Title>
			<Card.Description>Select a user to login. No password needed for now.</Card.Description>
		</Card.Header>
		<Card.Content>
			<form method="POST" action="?/login" class="grid gap-4">
				<div class="grid gap-2">
					<Label for="username">Username</Label>
					<Select type="single" bind:value={selectedUsername} name="username">
						<Trigger class="w-full">{selectedLabel}</Trigger>
						<Content>
							{#each usernames as username}
								<Item value={username} label={username}>{username}</Item>
							{/each}
						</Content>
					</Select>
=				</div>

                {#if form?.error}
                    <p class="text-sm font-medium text-destructive">{form.error}</p>
                {/if}

				<Button type="submit" class="w-full">Login</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
