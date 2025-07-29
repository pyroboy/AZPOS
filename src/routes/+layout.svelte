<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner';
	import { themeStore } from '$lib/stores/themeStore.svelte';

	// import SessionManager from '$lib/components/SessionManager.svelte';
	import type { LayoutData } from './$types';
	import { page } from '$app/stores';

	// TanStack Query for server-centric state management
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import { browser } from '$app/environment';

	// Configure Telefunc client-side
	if (browser) {
		import('telefunc/client').then(({ config }) => {
			config.telefuncUrl = '/_telefunc';
		});
	}

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
	const { data, children } = $props<{ data: LayoutData; children: () => void }>();
</script>

<!-- Provide TanStack Query client to all components -->
<QueryClientProvider client={queryClient}>
	<Toaster />
	
	<!-- Session management temporarily disabled
	{#if browser}
		<SessionManager user={data.user} />
	{/if}
	-->

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
