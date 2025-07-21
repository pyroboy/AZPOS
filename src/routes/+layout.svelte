<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import '../app.css';
	import { Toaster } from '$lib/components/ui/sonner';
	import '$lib/stores/themeStore';

	import { session } from '$lib/stores/sessionStore';
	import type { LayoutData } from './$types';
		import { page } from '$app/stores';
	import { products } from '$lib/stores/productStore';
	import { productBatches } from '$lib/stores/productBatchStore';

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
			products.set(data.products);
		}
		if (data.productBatches) {
			productBatches.set(data.productBatches);
		}
	});
</script>


<Toaster />

{#if $page.data.user}
	<Sidebar.Provider>
		<div class="flex h-screen bg-background text-foreground">
			<AppSidebar />
			<main class="flex-1 overflow-y-auto p-4 md:p-8">
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