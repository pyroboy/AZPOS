<script>
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Menu, ShoppingCart, User, Heart } from 'lucide-svelte';
	
	let { toggleSidebar } = $props();
	
	let cartItemCount = $state(3);
</script>

<header class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="container flex h-16 items-center justify-between px-4">
		<!-- Left section: Menu button and Logo -->
		<div class="flex items-center gap-4">
			<Button
				variant="ghost"
				size="sm"
				class="md:hidden"
				onclick={toggleSidebar}
			>
				<Menu class="h-5 w-5" />
				<span class="sr-only">Toggle menu</span>
			</Button>
			
			<div class="flex items-center gap-2">
				<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
					<span class="text-sm font-bold">AG</span>
				</div>
				<span class="hidden font-bold sm:inline-block">AZ Grocery</span>
			</div>
		</div>
		
		<!-- Center section: Search (hidden on mobile) -->
		<div class="hidden flex-1 px-6 md:block">
			<div class="mx-auto max-w-md">
				<!-- Search will be handled in the main page -->
			</div>
		</div>
		
		<!-- Right section: Actions -->
		<div class="flex items-center gap-2">
			<!-- Wishlist button (hidden on mobile) -->
			<Button variant="ghost" size="sm" class="hidden sm:flex">
				<Heart class="h-5 w-5" />
				<span class="sr-only">Wishlist</span>
			</Button>
			
			<!-- Cart button -->
			<Button variant="ghost" size="sm" class="relative">
				<ShoppingCart class="h-5 w-5" />
				{#if cartItemCount > 0}
					<Badge 
						variant="destructive" 
						class="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center p-0 text-xs"
					>
						{cartItemCount}
					</Badge>
				{/if}
				<span class="sr-only">Shopping cart</span>
			</Button>
			
			<!-- User account button -->
			<Button variant="ghost" size="sm">
				<User class="h-5 w-5" />
				<span class="sr-only">Account</span>
			</Button>
		</div>
	</div>
	
	<!-- Mobile search bar -->
	<div class="border-t px-4 py-3 md:hidden">
		<div class="flex items-center gap-2">
			<div class="flex-1">
				<!-- Mobile search handled in main page -->
			</div>
		</div>
	</div>
</header>
