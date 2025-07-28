<!-- Agent: agent_coder | File: StaffModeBadge.svelte | Last Updated: 2025-07-28T10:41:46+08:00 -->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
import { useAuth } from '$lib/data/auth';
	import { Shield, ShieldCheck, LogOut, Settings, User } from 'lucide-svelte';
	
	// Initialize auth composable
	const auth = useAuth();
	
	// Login state
	let showLoginDialog = $state(false);
	let pin = $state('');
	let loginError = $state('');
	
	// Handle staff login
	async function handleLogin() {
		if (!pin.trim()) {
			loginError = 'Please enter your PIN';
			return;
		}
		
		loginError = '';
		
		try {
			const result = await auth.loginWithPin(pin);
			
			if (result.success) {
				showLoginDialog = false;
				pin = '';
				loginError = '';
			} else {
				loginError = result.error || 'Login failed';
			}
		} catch (error) {
			loginError = 'Login failed. Please try again.';
		}
	}
	
	// Handle staff logout
	function handleLogout() {
		auth.logout();
		showLoginDialog = false;
		pin = '';
		loginError = '';
	}
	
	// Handle staff mode toggle
	function toggleStaffMode() {
		auth.toggleStaffMode();
	}
	
	// Handle PIN input keypress
	function handleKeyPress(event: KeyboardEvent): void {
		if (event.key === 'Enter') {
			handleLogin();
		}
	}
	
	// Get role display name
	function getRoleDisplayName(role: string): string {
		const roleNames: Record<string, string> = {
			guest: 'Guest',
			cashier: 'Cashier',
			pharmacist: 'Pharmacist',
			manager: 'Manager',
			admin: 'Administrator',
			owner: 'Owner'
		};
		return roleNames[role] || role;
	}
	
	// Get role badge variant
	function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
		switch (role) {
			case 'owner':
			case 'admin':
				return 'default';
			case 'manager':
				return 'secondary';
			case 'pharmacist':
				return 'outline';
			case 'cashier':
				return 'outline';
			default:
				return 'secondary';
		}
	}
</script>

<div class="flex items-center gap-2">
	{#if auth.isStaff}
		<!-- Staff Mode Toggle -->
		<Button
			variant={auth.isStaffMode ? 'default' : 'outline'}
			size="sm"
			onclick={toggleStaffMode}
			class="flex items-center gap-2"
		>
			{#if auth.isStaffMode}
				<ShieldCheck class="h-4 w-4" />
				<span>Staff Mode</span>
			{:else}
				<Shield class="h-4 w-4" />
				<span>Customer Mode</span>
			{/if}
		</Button>
		
		<!-- User Info Badge -->
		<Badge variant={getRoleBadgeVariant(auth.userRole)} class="flex items-center gap-1">
			<User class="h-3 w-3" />
			<span>{auth.userName}</span>
			<span class="text-xs opacity-75">({getRoleDisplayName(auth.userRole)})</span>
		</Badge>
		
		<!-- Logout Button -->
		<Button
			variant="ghost"
			size="sm"
			onclick={handleLogout}
			class="flex items-center gap-1 text-muted-foreground hover:text-foreground"
		>
			<LogOut class="h-4 w-4" />
			<span class="sr-only">Logout</span>
		</Button>
	{:else}
		<!-- Guest Mode - Login Button -->
		<Dialog bind:open={showLoginDialog}>
			<DialogTrigger>
				<Button variant="outline" size="sm" class="flex items-center gap-2">
					<Shield class="h-4 w-4" />
					<span>Staff Login</span>
				</Button>
			</DialogTrigger>
			<DialogContent class="sm:max-w-md">
				<DialogHeader>
					<DialogTitle class="flex items-center gap-2">
						<Shield class="h-5 w-5" />
						Staff Authentication
					</DialogTitle>
				</DialogHeader>
				
				<div class="space-y-4">
					<div class="space-y-2">
						<Label for="pin">Enter your PIN</Label>
						<Input
							id="pin"
							type="password"
							placeholder="••••"
							bind:value={pin}
							onkeypress={handleKeyPress}
							disabled={auth.loginWithPinStatus === 'pending'}
							class="text-center text-lg tracking-widest"
							maxlength={6}
						/>
						{#if loginError}
							<p class="text-sm text-destructive">{loginError}</p>
						{/if}
					</div>
					
					<div class="flex justify-end gap-2">
						<Button
							variant="outline"
							onclick={() => { showLoginDialog = false; pin = ''; loginError = ''; }}
							disabled={auth.loginWithPinStatus === 'pending'}
						>
							Cancel
						</Button>
						<Button
							onclick={handleLogin}
							disabled={auth.loginWithPinStatus === 'pending' || !pin.trim()}
						>
							{#if auth.loginWithPinStatus === 'pending'}
								<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
								Authenticating...
							{:else}
								Login
							{/if}
						</Button>
					</div>
					
					<!-- Demo PINs for testing -->
					<div class="text-xs text-muted-foreground space-y-1 pt-4 border-t">
						<p class="font-medium">Demo PINs:</p>
						<div class="grid grid-cols-2 gap-1">
							<p>Cashier: 1234</p>
							<p>Pharmacist: 2345</p>
							<p>Manager: 3456</p>
							<p>Admin: 4567</p>
							<p>Owner: 5678</p>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
		
		<!-- Guest Badge -->
		<Badge variant="secondary" class="flex items-center gap-1">
			<User class="h-3 w-3" />
			<span>Guest</span>
		</Badge>
	{/if}
</div>
