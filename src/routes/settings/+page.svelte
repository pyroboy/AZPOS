<script lang="ts">
import { themeStore } from '$lib/stores/themeStore.svelte';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { browser } from '$app/environment';

const isDarkMode = $derived.by(() => {
	if (!browser) return false; // Default to false on server
	if (themeStore.current.type === 'auto') {
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}
	return themeStore.current.type === 'dark';
});

function toggleTheme(checked: boolean) {
	const newTheme = {
		...themeStore.current,
		type: checked ? 'dark' as const : 'light' as const
	};
	themeStore.setTheme(newTheme);
}
</script>

<div class="p-8">
	<h1 class="text-2xl font-bold mb-4">Settings</h1>
	<div class="flex items-center space-x-2">
		<Switch id="dark-mode" checked={isDarkMode} onCheckedChange={toggleTheme} />
		<Label for="dark-mode">Dark Mode</Label>
	</div>
</div>
