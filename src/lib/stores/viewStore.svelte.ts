import { browser } from '$app/environment';

type ViewMode = 'card' | 'table';

const KEY = 'product_view_mode';

// Read initial value from localStorage if in the browser, otherwise default to 'card'.
const initialValue: ViewMode = (browser && (localStorage.getItem(KEY) as ViewMode)) || 'card';

// Use $state for view mode
export let viewMode = $state<ViewMode>(initialValue);

// Use $effect to sync changes to localStorage
$effect(() => {
	if (!browser) return;

	localStorage.setItem(KEY, viewMode);
});

// Export function to change view mode
export function setViewMode(mode: ViewMode) {
	viewMode = mode;
}

export function toggleViewMode() {
	viewMode = viewMode === 'card' ? 'table' : 'card';
}
