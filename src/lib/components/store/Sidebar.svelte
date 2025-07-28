<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { Apple, Beef, Milk, Wheat, Fish, IceCream, Coffee, Salad, X } from 'lucide-svelte';


// Category selection props
let { isOpen = $bindable(), onCategorySelect }: { isOpen: boolean; onCategorySelect?: (categoryId: string) => void } = $props();

import { useInventory } from '$lib/data/inventory';

let selectedCategory = $state('Fresh Produce');
const inventoryHook = useInventory();
// Since categories property doesn't exist, use empty array for now
const categories: any[] = [];

// Function to select appropriate icon based on category name
function selectIcon(categoryName: string) {
    const iconMap: Record<string, typeof Apple> = {
        'Fresh Produce': Apple,
        'Meat & Poultry': Beef,
        'Dairy & Eggs': Milk,
        'Bakery': Wheat,
        'Seafood': Fish,
        'Frozen Foods': IceCream,
        'Beverages': Coffee,
        'Pantry Staples': Salad
    };
    return iconMap[categoryName] || Salad; // Default to Salad icon
}

// Prepare categories with icons as needed
const categoriesWithIcons = $derived.by(() => {
    if (!categories || categories.length === 0) {
        // Fallback to static categories if dynamic ones are not available
        return [
            { name: 'Fresh Produce', icon: Apple, count: 124 },
            { name: 'Meat & Poultry', icon: Beef, count: 67 },
            { name: 'Dairy & Eggs', icon: Milk, count: 45 },
            { name: 'Bakery', icon: Wheat, count: 32 },
            { name: 'Seafood', icon: Fish, count: 28 },
            { name: 'Frozen Foods', icon: IceCream, count: 89 },
            { name: 'Beverages', icon: Coffee, count: 156 },
            { name: 'Pantry Staples', icon: Salad, count: 203 }
        ];
    }
    return categories.map((cat: any) => ({
        ...cat,
        icon: selectIcon(cat.name)
    }));
});

	function selectCategory(categoryName: string, categoryId?: string) {
		selectedCategory = categoryName;
		// Notify parent component about category selection
		if (onCategorySelect) {
			onCategorySelect(categoryId || categoryName);
		}
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
		<Button variant="ghost" size="sm" onclick={closeSidebar} class="md:hidden">
			<X class="h-4 w-4" />
			<span class="sr-only">Close sidebar</span>
		</Button>
	</div>

	<!-- Categories list -->
	<ScrollArea class="h-[calc(100vh-8rem)]">
		<div class="p-4">
			<div class="space-y-2">
{#each categoriesWithIcons as category}
					<Button
						variant={selectedCategory === category.name ? 'default' : 'ghost'}
						class="w-full justify-start text-left"
					onclick={() => selectCategory(category.name, category.id)}
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
