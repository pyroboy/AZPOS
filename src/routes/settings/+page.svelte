<script lang="ts">
	import { theme } from '$lib/stores/themeStore';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { derived } from 'svelte/store';
	import { browser } from '$app/environment';

	const isDarkMode = derived(theme, ($theme) => {
		if (!browser) return false; // Default to false on server
		if ($theme === 'system') {
			return window.matchMedia('(prefers-color-scheme: dark)').matches;
		}
		return $theme === 'dark';
	});

	function toggleTheme(checked: boolean) {
		theme.set(checked ? 'dark' : 'light');
	}
</script>

<div class="p-8">
	<h1 class="text-2xl font-bold mb-4">Settings</h1>
	<div class="flex items-center space-x-2">
		<Switch id="dark-mode" checked={$isDarkMode} onCheckedChange={(checked) => toggleTheme(checked)} />
		<Label for="dark-mode">Dark Mode</Label>
	</div>
</div>
