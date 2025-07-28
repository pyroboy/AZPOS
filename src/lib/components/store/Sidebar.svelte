<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { 
		Apple, 
		Beef, 
		Milk, 
		Wheat, 
		Fish, 
		IceCream, 
		Coffee, 
		Salad,
		X
	} from 'lucide-svelte';
	
	let { isOpen = $bindable() } = $props();
	
	const categories = [
		{ name: 'Fresh Produce', icon: Apple, count: 124 },
		{ name: 'Meat & Poultry', icon: Beef, count: 67 },
		{ name: 'Dairy & Eggs', icon: Milk, count: 45 },
		{ name: 'Bakery', icon: Wheat, count: 32 },
		{ name: 'Seafood', icon: Fish, count: 28 },
		{ name: 'Frozen Foods', icon: IceCream, count: 89 },
		{ name: 'Beverages', icon: Coffee, count: 156 },
		{ name: 'Pantry Staples', icon: Salad, count: 203 }
	];
	
	let selectedCategory = $state('Fresh Produce');
	
	function selectCategory(categoryName: string) {
		selectedCategory = categoryName;
	}
	
	function closeSidebar() {
		isOpen = false;
	}
</script>

<!-- Mobile overlay -->
{#if isOpen}
	<div 
		class="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden" 
		onclick={closeSidebar}
		role="button"
		tabindex="0"
		onkeydown={(e) => e.key === 'Enter' && closeSidebar()}
	></div>
{/if}

<!-- Sidebar -->
<aside 
	class="fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-64 -translate-x-full border-r bg-background transition-transform duration-300 ease-in-out md:translate-x-0"
	class:translate-x-0={isOpen}
>
	<!-- Sidebar header -->
	<div class="flex items-center justify-between border-b p-4">
		<h2 class="text-lg font-semibold">Categories</h2>
		<Button
			variant="ghost"
			size="sm"
			onclick={closeSidebar}
			class="md:hidden"
		>
			<X class="h-4 w-4" />
			<span class="sr-only">Close sidebar</span>
		</Button>
	</div>
	
	<!-- Categories list -->
	<ScrollArea class="h-[calc(100vh-8rem)]">
		<div class="p-4">
			<div class="space-y-2">
				{#each categories as category}
					<Button
						variant={selectedCategory === category.name ? 'default' : 'ghost'}
						class="w-full justify-start text-left"
						onclick={() => selectCategory(category.name)}
					>
						{@const IconComponent = category.icon}
						<IconComponent class="mr-3 h-4 w-4" />
						<span class="flex-1">{category.name}</span>
						<Badge variant="secondary" class="ml-auto">
							{category.count}
						</Badge>
					</Button>
				{/each}
			</div>
			
			<Separator class="my-4" />
			
			<!-- Special offers section -->
			<div class="space-y-2">
				<h3 class="text-sm font-medium text-muted-foreground">Special Offers</h3>
				<Button variant="ghost" class="w-full justify-start text-left">
					<span class="mr-3">🔥</span>
					<span>Hot Deals</span>
					<Badge variant="destructive" class="ml-auto">New</Badge>
				</Button>
				<Button variant="ghost" class="w-full justify-start text-left">
					<span class="mr-3">💰</span>
					<span>Clearance</span>
				</Button>
				<Button variant="ghost" class="w-full justify-start text-left">
					<span class="mr-3">🏷️</span>
					<span>Weekly Specials</span>
				</Button>
			</div>
		</div>
	</ScrollArea>
</aside>
