import { writable } from 'svelte/store';
import { debounce } from 'ts-debounce';

// State
export const searchTerm = writable('');
export const activeCategories = writable<string[]>([]);
export const sortOrder = writable('name_asc');

// Actions
export const setSearchDebounced = debounce((value: string) => searchTerm.set(value), 300);

export function toggleCategory(category: string) {
	activeCategories.update((cats) =>
		cats.includes(category) ? cats.filter((c) => c !== category) : [...cats, category]
	);
}

export function clearFilters() {
	searchTerm.set('');
	activeCategories.set([]);
}
