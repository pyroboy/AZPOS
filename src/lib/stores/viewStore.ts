import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type ViewMode = 'card' | 'table';

const KEY = 'product_view_mode';

// Read initial value from localStorage if in the browser, otherwise default to 'card'.
const initialValue: ViewMode = (browser && (localStorage.getItem(KEY) as ViewMode)) || 'card';

// Create a writable store.
export const viewMode = writable<ViewMode>(initialValue);

// If in the browser, subscribe to the store's changes and persist them to localStorage.
if (browser) {
	viewMode.subscribe((value) => {
		localStorage.setItem(KEY, value);
	});
}
