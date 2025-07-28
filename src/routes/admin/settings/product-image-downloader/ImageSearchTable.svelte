<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Table from '$lib/components/ui/table';
	import type { ProductWithStatus, FoundImage } from './types';
	import ImagePreview from '../../../../lib/components/inventory/ImagePreview.svelte';
	import ImageSelectionDialog from './ImageSelectionDialog.svelte';

	let { products = $bindable() } = $props<{ products: ProductWithStatus[] }>();

	let activeProduct = $state<ProductWithStatus | null>(null);
	let foundImages = $state<FoundImage[]>([]);
	let isLoading = $state(false);
	let isAutoFinding = $state(false);

	async function handleSearch(product: ProductWithStatus) {
		activeProduct = product;
		isLoading = true;
		foundImages = [];

		try {
			const response = await fetch(
				`/admin/settings/product-image-downloader/search?name=${encodeURIComponent(product.name)}`
			);
			if (response.ok) {
				const data = await response.json();
				foundImages = data.images;
				// Update status to 'searching' even if no images are found
				products = products.map((p: ProductWithStatus) =>
					p.sku === product.sku ? { ...p, status: 'searching' } : p
				);
			} else {
				console.error('Search failed');
				products = products.map((p: ProductWithStatus) =>
					p.sku === product.sku ? { ...p, status: 'error' } : p
				);
			}
		} catch (error) {
			console.error('Error during search:', error);
			products = products.map((p: ProductWithStatus) =>
				p.sku === product.sku ? { ...p, status: 'error' } : p
			);
		} finally {
			isLoading = false;
		}
	}

	function selectImage(image: FoundImage, blob: Blob) {
		if (!activeProduct) return;

		const currentProductSku = activeProduct.sku;
		products = products.map((p: ProductWithStatus) => {
			if (p.sku === currentProductSku) {
				return {
					...p,
					image_url: image.image_url,
					status: 'selected',
					foundImages: [],
					imageBlob: blob
				};
			}
			return p;
		});
		activeProduct = null; // Close dialog
	}

	async function handleDialogSearch(searchTerm: string) {
		if (!activeProduct) return;

		isLoading = true;
		foundImages = [];

		try {
			const response = await fetch(
				`/admin/settings/product-image-downloader/search?name=${encodeURIComponent(searchTerm)}`
			);
			if (response.ok) {
				const data = await response.json();
				foundImages = data.images;
			} else {
				console.error('Search failed');
				foundImages = [];
			}
		} catch (error) {
			console.error('Error during search:', error);
			foundImages = [];
		} finally {
			isLoading = false;
		}
	}

	async function autoFindAllImages() {
		isAutoFinding = true;
		const productsToUpdate = products.filter(
			(p: ProductWithStatus) => p.status === 'initial' || p.status === 'error'
		);

		let updatedProducts = [...products];

		for (const product of productsToUpdate) {
			try {
				const response = await fetch(
					`/admin/settings/product-image-downloader/search?name=${encodeURIComponent(product.name)}`
				);
				if (response.ok) {
					const data = await response.json();
					const firstImage = data.images?.[0];
					if (firstImage) {
						updatedProducts = updatedProducts.map((p) =>
							p.sku === product.sku ? { ...p, image_url: firstImage.image_url, status: 'found' } : p
						);
					} else {
						updatedProducts = updatedProducts.map((p) =>
							p.sku === product.sku ? { ...p, status: 'error' } : p
						);
					}
				} else {
					updatedProducts = updatedProducts.map((p) =>
						p.sku === product.sku ? { ...p, status: 'error' } : p
					);
				}
			} catch (error) {
				console.error(`Failed to auto-find image for ${product.sku}`, error);
				updatedProducts = updatedProducts.map((p) =>
					p.sku === product.sku ? { ...p, status: 'error' } : p
				);
			}
		}
		products = updatedProducts;
		isAutoFinding = false;
	}
</script>

<div class="mb-4">
	<Button onclick={autoFindAllImages} disabled={isAutoFinding}>
		{#if isAutoFinding}Searching for all...{:else}Auto-Find All Images{/if}
	</Button>
</div>
<Table.Root>
	<Table.Header>
		<Table.Row>
			<Table.Head>SKU</Table.Head>
			<Table.Head>Name</Table.Head>
			<Table.Head>Current Image</Table.Head>
			<Table.Head>Status</Table.Head>
			<Table.Head>Action</Table.Head>
		</Table.Row>
	</Table.Header>
	<Table.Body>
		{#each products as product (product.id)}
			<Table.Row>
				<Table.Cell>{product.sku}</Table.Cell>
				<Table.Cell>{product.name}</Table.Cell>
				<Table.Cell>
					<ImagePreview
						src={product.image_url}
						fallbackSrc={product.selected_image_url}
						alt={product.name}
						{product}
					/>
				</Table.Cell>
				<Table.Cell class="capitalize">{product.status}</Table.Cell>
				<Table.Cell>
					<Button onclick={() => handleSearch(product)}>Find Image</Button>
				</Table.Cell>
			</Table.Row>
		{/each}
	</Table.Body>
</Table.Root>

{#if activeProduct}
	<ImageSelectionDialog
		open={activeProduct !== null}
		images={foundImages}
		productName={activeProduct.name}
		onselect={(image, blob) => selectImage(image, blob)}
		onclose={() => (activeProduct = null)}
		onsearch={handleDialogSearch}
	/>
{/if}
