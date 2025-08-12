<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import type { ActionData, PageData } from './$types';
	import { Badge } from '$lib/components/ui/badge';

	let { form, data }: { form: ActionData; data: PageData } = $props();

	const users = data.users ?? [];
	let emailInput = $state('');
	let passwordInput = $state('');

	// Temporary test users for quick login
	const testUsers = [
		{ email: 'admin@azpos.com', password: 'admin123', role: 'Admin', name: 'Admin User' },
		{ email: 'cashier@azpos.com', password: 'cashier123', role: 'Cashier', name: 'Cashier User' },
		{ email: 'manager@azpos.com', password: 'manager123', role: 'Manager', name: 'Manager User' }
	];

	// Function to autofill login form with test user data
	function quickLogin(user: typeof testUsers[0]) {
		emailInput = user.email;
		passwordInput = user.password;
	}
</script>

<div class="min-h-screen bg-muted/40 flex items-center justify-center p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header class="text-center">
			<Card.Title class="text-2xl">AZPOS – Sign In</Card.Title>
			<Card.Description>Enter your credentials to continue.</Card.Description>
		</Card.Header>
		<Card.Content>
			<!-- TEMPORARY: Quick login buttons for testing -->
			<div class="mb-4 p-3 bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/25">
				<p class="text-xs text-muted-foreground mb-2 text-center font-medium">🚧 TEMPORARY: Quick Login (Development Only)</p>
				<div class="grid gap-2">
					{#each testUsers as user}
						<button 
							type="button"
							class="w-full flex items-center justify-between p-2 text-xs bg-background border border-input rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
							on:click={() => quickLogin(user)}
						>
							<span>{user.name}</span>
							<Badge variant="secondary" class="text-xs">{user.role}</Badge>
						</button>
					{/each}
				</div>
			</div>

			<form method="POST" action="?/login" class="grid gap-4">
				<div class="grid gap-2">
					<Label for="email">Email</Label>
					<Input 
						id="email" 
						name="email" 
						type="email" 
						placeholder="Enter your email"
						bind:value={emailInput}
						required 
					/>
				</div>

				<div class="grid gap-2">
					<Label for="password">Password</Label>
					<Input 
						id="password" 
						name="password" 
						type="password" 
						placeholder="Enter your password"
						bind:value={passwordInput}
						required 
					/>
				</div>

				{#if form?.error}
					<p class="text-sm font-medium text-destructive">{form.error}</p>
				{/if}

				<Button type="submit" class="w-full" disabled={!emailInput || !passwordInput}>Sign In →</Button>
			</form>
		</Card.Content>
		<Card.Footer>
			<p class="text-xs text-muted-foreground text-center w-full">
				Logout is available from the user menu on any page.
			</p>
		</Card.Footer>
	</Card.Root>
</div>
