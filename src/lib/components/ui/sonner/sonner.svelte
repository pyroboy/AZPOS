<script lang="ts">
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from "svelte-sonner";
	import { theme } from '$lib/stores/themeStore';
	import { derived } from 'svelte/store';
	import { browser } from '$app/environment';

	let { ...restProps }: SonnerProps = $props();

	const sonnerTheme = derived(theme, ($theme) => {
		if (!browser) return 'light'; // Default to light on server to avoid SSR errors
		if ($theme === 'system') {
			return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
		return $theme;
	});
</script>

<Sonner
	theme={$sonnerTheme}
	class="toaster group"
	style="--normal-bg: var(--color-popover); --normal-text: var(--color-popover-foreground); --normal-border: var(--color-border);"
	{...restProps}
/>
