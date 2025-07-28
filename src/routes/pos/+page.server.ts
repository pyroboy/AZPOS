import { products } from '$lib/stores/productStore.svelte';
import { get } from 'svelte/store';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
  await products.loadProducts(fetch); // This uses the new loadProductsCached method
  return { products: get(products) };
};
