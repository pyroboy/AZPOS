<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner';
	import '$lib/stores/themeStore';

	import { session } from '$lib/stores/sessionStore.svelte';
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';
	import { productManager } from '$lib/stores/productStore.svelte';
	import { inventoryManager } from '$lib/stores/inventoryStore.svelte';

	// TanStack Query for server-centric state management
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';

	// Create QueryClient instance
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 1000 * 60 * 5, // 5 minutes
				gcTime: 1000 * 60 * 30, // 30 minutes
				retry: (failureCount, error) => {
					// Don't retry on 4xx errors
					if (error && typeof error === 'object' && 'status' in error) {
						const status = error.status as number;
						if (status >= 400 && status < 500) return false;
					}
					return failureCount < 3;
				},
				refetchOnWindowFocus: false,
				refetchOnReconnect: 'always'
			},
			mutations: {
				retry: false
			}
		}
	});

	// The `data` prop is reactive and contains the `user` from the load function.
	const { data, children } = $props<{ data: LayoutData; children: any }>();

	// When the user data changes (e.g., on login/logout),
	// this reactive statement will run and update our client-side session store.
	$effect(() => {
		session.setSession(data.user);
	});

	// This reactive statement runs on the client when the component mounts.
	// It takes the product data loaded on the server and sets it in our client-side stores.
	// This process is called "hydration".
	$effect(() => {
		if (data.products) {
			productManager.setProducts(data.products);
		}
		if (data.productBatches) {
			inventoryManager.productBatches = data.productBatches;
		}
	});
</script>

<!-- Provide TanStack Query client to all components -->
<QueryClientProvider client={queryClient}>
	<Toaster />

{#if $page.data.user}
	<Sidebar.Provider>
		<div class="flex h-screen bg-background text-foreground w-full">
			<AppSidebar />
			<main class="flex-1 overflow-y-auto p-4 md:p-8 w-full">
				<Sidebar.Trigger />
				{@render children()}
			</main>
		</div>
	</Sidebar.Provider>
{:else}
	<main class="flex-1 overflow-y-auto p-4 md:p-8">
		{@render children()}
	</main>
{/if}
</QueryClientProvider>