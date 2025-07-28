<!-- Agent: agent_coder | File: CategoryFilter.svelte | Last Updated: 2025-07-28T11:45:54+08:00 -->
<script lang="ts">
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { Filter } from 'lucide-svelte';

	// Props
	interface Props {
		categories?: Array<{id: string, name: string, product_count?: number}>;
		selectedCategory?: string;
		onCategoryChange?: (category: string) => void;
	}
	
	let { 
		categories = [],
		selectedCategory = $bindable('all'),
		onCategoryChange = () => {}
	}: Props = $props();
	
	// Derive the display label from the selected value
	const selectedLabel = $derived(
		selectedCategory === 'all' 
			? 'All Categories' 
			: categories.find(c => c.id === selectedCategory)?.name || 'Select category'
	);
	
	// Watch for changes and call the callback
	$effect(() => {
		onCategoryChange(selectedCategory);
	});
</script>

<div class="space-y-2">
	<div class="flex items-center gap-4">
		<div class="flex items-center gap-2">
			<Filter class="h-4 w-4 text-muted-foreground" />
			<span class="text-sm font-medium">Filter by Category:</span>
		</div>
		
		<Select type="single" bind:value={selectedCategory}>
			<SelectTrigger class="w-48">
				<span class="text-sm">{selectedLabel}</span>
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="all">
					<div class="flex items-center justify-between w-full">
						<span>All Categories</span>
						<Badge variant="secondary" class="ml-2">
							{categories.reduce((sum, cat) => sum + (cat.product_count || 0), 0)}
						</Badge>
					</div>
				</SelectItem>
				{#each categories as category (category.id)}
					<SelectItem value={category.id}>
						<div class="flex items-center justify-between w-full">
							<span>{category.name}</span>
							{#if category.product_count !== undefined}
								<Badge variant="secondary" class="ml-2">
									{category.product_count}
								</Badge>
							{/if}
						</div>
					</SelectItem>
				{/each}
			</SelectContent>
		</Select>
	</div>

	<!-- Active Filter Display -->
	{#if selectedCategory !== 'all'}
		{@const activeCategory = categories.find(c => c.id === selectedCategory)}
		{#if activeCategory}
			<div class="flex items-center gap-2">
				<span class="text-sm text-muted-foreground">Filtered by:</span>
				<Badge variant="secondary" class="gap-1">
					{activeCategory.name}
					<button
						onclick={() => selectedCategory = 'all'}
						class="ml-1 hover:bg-muted-foreground/20 rounded-sm p-0.5"
						aria-label="Clear category filter"
					>
						<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</Badge>
			</div>
		{/if}
	{/if}
</div>

