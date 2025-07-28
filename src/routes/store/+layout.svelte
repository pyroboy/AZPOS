<script>
	import Header from '$lib/components/store/Header.svelte';
	import Footer from '$lib/components/store/Footer.svelte';
	import Sidebar from '$lib/components/store/Sidebar.svelte';

	let { children } = $props();
	let sidebarOpen = $state(false);

	function toggleSidebar() {
		sidebarOpen = !sidebarOpen;
	}
</script>

<div class="flex min-h-screen flex-col bg-background">
	<Header {toggleSidebar} />

	<div class="flex flex-1">
	<Sidebar bind:isOpen={sidebarOpen} onCategorySelect={(categoryId) => {
			// Pass category selection to child pages via context or custom event
			// For now, we'll use a simple approach with custom events
			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent('categorySelected', { detail: categoryId }));
			}
		}} />

		<main
			class="flex-1 p-4 transition-all duration-300 ease-in-out md:ml-0"
			class:md:ml-64={sidebarOpen}
		>
			{@render children()}
		</main>
	</div>

	<Footer />
</div>
