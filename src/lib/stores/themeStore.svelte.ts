import { browser } from '$app/environment';

function createThemeStore() {
	// Use $state for theme value
	let theme = $state<'light' | 'dark' | 'system'>('system');

	// Use $effect to apply theme changes to DOM and localStorage
	$effect(() => {
		if (!browser) return;

		const root = document.documentElement;
		root.classList.remove('light', 'dark');

		if (theme === 'system') {
			const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
				? 'dark'
				: 'light';
			root.classList.add(systemTheme);
			localStorage.removeItem('theme');
		} else {
			root.classList.add(theme);
			localStorage.setItem('theme', theme);
		}
	});

	// Initialize theme from localStorage on first load
	if (browser) {
		const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
		theme = savedTheme || 'system';
	}

	function setTheme(newTheme: 'light' | 'dark' | 'system') {
		theme = newTheme;
	}

	return {
		get theme() {
			return theme;
		},
		setTheme
	};
}

export const theme = createThemeStore();
