<!-- Agent: agent_coder | File: SearchBar.svelte | Last Updated: 2025-07-28T10:29:03+08:00 -->
<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Search, X } from 'lucide-svelte';
	
	// Props interface
	interface Props {
		searchQuery?: string;
		placeholder?: string;
		debounceMs?: number;
		onSearch?: (query: string) => void;
	}
	
	let { 
		searchQuery = $bindable(''),
		placeholder = 'Search for products...',
		debounceMs = 300,
		onSearch = () => {}
	}: Props = $props();
	
	// Internal state
	let debounceTimer: NodeJS.Timeout | undefined;
	
	// Debounced search to avoid excessive API calls
	function handleInput(event: Event) {
		const value = (event.target as HTMLInputElement).value;
		
		// Clear existing timer
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		
		// Set new timer
		debounceTimer = setTimeout(() => {
			searchQuery = value;
		}, debounceMs);
	}
	
	// Clear search
	function clearSearch(): void {
		searchQuery = '';
		onSearch('');
	}
	
	// Handle keyboard shortcuts
	function handleKeydown(event: KeyboardEvent): void {
		// Escape key clears search
		if (event.key === 'Escape') {
			clearSearch();
		}
	}
</script>

<div class="relative">
	<!-- Search Icon -->
	<Search class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
	
	<!-- Search Input -->
	<Input
		type="text"
		{placeholder}
		class="pl-10 pr-10"
		oninput={handleInput}
		onkeydown={handleKeydown}
		value={searchQuery}
	/>
	
	<!-- Clear Button -->
	{#if searchQuery}
		<Button
			variant="ghost"
			size="sm"
			class="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 hover:bg-muted"
			onclick={clearSearch}
			aria-label="Clear search"
		>
			<X class="h-4 w-4" />
		</Button>
	{/if}
</div>

<!-- Search suggestions could be added here in the future -->
<!-- 
<div class="absolute top-full left-0 right-0 bg-card border rounded-md shadow-lg z-50 mt-1">
	Search suggestions...
</div>
-->
