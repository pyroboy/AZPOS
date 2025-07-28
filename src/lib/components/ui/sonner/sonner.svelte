<script lang="ts">
	import { Toaster as Sonner, type ToasterProps as SonnerProps } from 'svelte-sonner';
	// import { theme } from '$lib/stores/themeStore';
	import { browser } from '$app/environment';

	let { ...restProps }: SonnerProps = $props();

	// Simple theme state without store complexity
	let currentTheme: 'light' | 'dark' | 'system' = 'light';
</script>

<Sonner
	theme={currentTheme}
	class="toaster group"
	style="--normal-bg: var(--color-popover); --normal-text: var(--color-popover-foreground); --normal-border: var(--color-border);"
	{...restProps}
/>
