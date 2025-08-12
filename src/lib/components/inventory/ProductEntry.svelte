<script lang="ts">
	import { z } from 'zod';
	import { superForm } from 'sveltekit-superforms/client';
	import { zod } from 'sveltekit-superforms/adapters';
	import { productInputSchema, type Product, type ProductInput } from '$lib/types/product.schema';
	import { getProducts, createProduct } from '$lib/remote/products.remote';
	import { getSuppliers } from '$lib/remote/suppliers.remote';
	import { getCategories } from '$lib/remote/categories.remote';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toast } from 'svelte-sonner';
	import { debounce } from 'ts-debounce';
	import * as Switch from '$lib/components/ui/switch/index.js';
	import { Trash2 } from 'lucide-svelte';
	import RecentProductsTable from '$lib/components/inventory/RecentProductsTable.svelte';

	let open = $state(false);
	let closeOnSave = $state(true);
	let imageUrlPreview = $state('');
	let skuStatus: 'idle' | 'checking' | 'taken' | 'available' = $state('idle');

	// Remote function data fetching
	const productsQuery = getProducts();
	const suppliersQuery = getSuppliers();
	const categoriesQuery = getCategories();
	let isCreating = $state(false);

	// Variant state
	let enableVariants = $state(false);
	type VariantOption = { name: string; values: string };
	let variantOptions: VariantOption[] = $state([{ name: '', values: '' }]);

	// Bundle state
	let enableBundle = $state(false);
	type BundleComponent = Product & { quantity: number };
	let selectedComponents: BundleComponent[] = $state([]);
	let bundleSearchTerm = $state('');

	// Bundle search will be handled in template with await pattern

	const addBundleComponent = (product: Product) => {
		selectedComponents = [...selectedComponents, { ...product, quantity: 1 }];
		bundleSearchTerm = '';
	};

	const removeBundleComponent = (productId: string) => {
		selectedComponents = selectedComponents.filter((c) => c.id !== productId);
	};

	const addVariantOption = () => {
		variantOptions = [...variantOptions, { name: '', values: '' }];
	};

	const removeVariantOption = (index: number) => {
		variantOptions = variantOptions.filter((_, i) => i !== index);
	};

	let generatedVariants: Record<string, string>[] = $derived(
		(() => {
			if (!enableVariants || variantOptions.every((opt) => !opt.name || !opt.values)) {
				return [];
			}

			const options = variantOptions
				.filter((opt) => opt.name && opt.values)
				.map((opt) => ({
					name: opt.name,
					values: opt.values
						.split(',')
						.map((v) => v.trim())
						.filter((v) => v)
				}));

			if (options.length === 0) {
				return [];
			}

			const cartesian = (...a: string[][]) =>
				a.reduce((acc, val) => acc.flatMap((d) => val.map((e) => [d, e].flat())), [
					[]
				] as string[][]);

			const valueSets = options.map((o) => o.values);
			const combinations = cartesian(...valueSets);

			return combinations.map((combo) => {
				const variant: Record<string, string> = {};
				options.forEach((option, i) => {
					variant[option.name] = combo[i];
				});
				return variant;
			});
		})()
	);

	const checkSkuUniqueness = async (sku: string) => {
		if (!sku || sku.length < 3) {
			skuStatus = 'idle';
			return;
		}
		skuStatus = 'checking';
		try {
			const data = await productsQuery;
			const isTaken = data?.products?.some((p: Product) => p.sku.toLowerCase() === sku.toLowerCase());
			skuStatus = isTaken ? 'taken' : 'available';
		} catch (error) {
			skuStatus = 'idle';
		}
	};

	const debouncedSkuCheck = debounce(checkSkuUniqueness, 300);

	const defaultData: z.infer<typeof productInputSchema> = {
		name: '',
		sku: '',
		description: '',
		category_id: '',
		supplier_id: '',
		cost_price: 0,
		selling_price: 0,
		stock_quantity: 0,
		min_stock_level: 0,
		max_stock_level: 100,
		reorder_point: 0,
		barcode: '',
		image_url: '',
		is_active: true,
		is_archived: false,
		is_bundle: false,
		bundle_components: [],
		tags: [],
		weight: 0,
		dimensions: undefined,
		tax_rate: 0,
		discount_eligible: true,
		track_inventory: true,
		aisle_location: ''
	};

	const form = superForm(defaultData, {
		validators: zod(productInputSchema),
		onUpdated: async ({ form }) => {
			if (form.valid) {
				isCreating = true;
				try {
					const productData = {
						...$formData,
						selling_price: Number($formData.selling_price) || 0,
						cost_price: Number($formData.cost_price) || 0,
						bundle_components:
							enableBundle && selectedComponents.length > 0
								? selectedComponents.map((c) => ({ product_id: c.id, quantity: c.quantity }))
								: undefined
					};

					await createProduct(productData);
					toast.success(`Product "${$formData.name}" has been added.`);
					if (closeOnSave) {
						open = false; // Close dialog on success
					} else {
						resetComponentState();
					}
				} catch (error: any) {
					toast.error(`Failed to add product: ${error.message}`);
				} finally {
					isCreating = false;
				}
			}
		}
	});

	const { form: formData, enhance, errors, allErrors, reset } = form;

	function resetComponentState() {
		imageUrlPreview = '';
		skuStatus = 'idle';
		enableVariants = false;
		variantOptions = [{ name: '', values: '' }];
		enableBundle = false;
		selectedComponents = [];
		bundleSearchTerm = '';
		reset(); // Resets the superform
	}

	// DERIVED STATE & EFFECTS HOOKED TO FORM DATA
	// These must be declared *after* `formData` is initialized by `superForm`.

	// Derived state will be computed in template with await pattern

	$effect(() => {
		// A product can be a variant or a bundle, but not both.
		if (enableVariants) {
			enableBundle = false;
			// Note: product_type field removed from new schema
		} else if (!enableBundle) {
			// Note: product_type field removed from new schema
		}
	});

	$effect(() => {
		if (enableBundle) {
			enableVariants = false;
			$formData.is_bundle = true;
		} else if (!enableVariants) {
			$formData.is_bundle = false;
		}
	});

	$effect(() => {
		imageUrlPreview = $formData.image_url ?? '';
	});

	$effect(() => {
		const sku = $formData.sku;
		if (sku !== undefined) {
			debouncedSkuCheck(sku);
		}
	});
</script>

<div class="w-full">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-2xl font-bold tracking-tight">Recent Products</h2>
			<p class="text-muted-foreground">A list of your 10 most recently created products.</p>
		</div>
		<div class="flex items-center space-x-2">
			<Button onclick={() => (open = true)}>+ Add New Product</Button>
		</div>
	</div>
	<RecentProductsTable />
</div>
<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-[800px]">
		<Dialog.Header>
			<Dialog.Title>Add New Product</Dialog.Title>
			<Dialog.Description>
				Fill out the details for the new product across all relevant tabs.
			</Dialog.Description>
		</Dialog.Header>

		<form method="POST" use:enhance>
			<Tabs.Root value="basic" class="mt-4">
				<Tabs.List class="grid w-full grid-cols-4">
					<Tabs.Trigger value="basic">Basic</Tabs.Trigger>
					<Tabs.Trigger value="inventory">Inventory</Tabs.Trigger>
					<Tabs.Trigger value="variants">Variants</Tabs.Trigger>
					<Tabs.Trigger value="bundle">Bundle</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="basic" class="mt-6 space-y-6">
					<div class="grid grid-cols-3 gap-6">
						<div class="col-span-2 space-y-6">
							<div class="grid md:grid-cols-2 gap-6">
								<div class="grid gap-2">
									<Label for="name">Product Name</Label>
									<Input id="name" name="name" bind:value={$formData.name} />
									{#if $errors.name}<span class="text-sm text-destructive">{$errors.name[0]}</span
										>{/if}
								</div>
								<div class="grid gap-2">
									<Label for="sku">SKU</Label>
									<div class="relative">
										<Input id="sku" name="sku" bind:value={$formData.sku} />
										<div
											class="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground"
										>
											{#if skuStatus === 'checking'}
												Checking...
											{:else if skuStatus === 'taken'}
												<span class="text-destructive">Taken</span>
											{:else if skuStatus === 'available'}
												<span class="text-green-500">Available</span>
											{/if}
										</div>
									</div>
									{#if $errors.sku}<span class="text-sm text-destructive">{$errors.sku[0]}</span
										>{/if}
								</div>
							</div>
							<div class="grid gap-2">
								<Label for="description">Description</Label>
								<Textarea id="description" name="description" bind:value={$formData.description} />
							</div>
							<div class="grid md:grid-cols-2 gap-6">
								<div class="grid gap-2">
									<Label for="category_id">Category</Label>
									{#await categoriesQuery}
										<Select.Root type="single" bind:value={$formData.category_id}>
											<Select.Trigger class="w-full">
												Loading categories...
											</Select.Trigger>
											<Select.Content>
												<!-- Loading state -->
											</Select.Content>
										</Select.Root>
									{:then categories}
										{@const selectedCategory = categories.find(c => c.id === $formData.category_id)}
										<Select.Root type="single" bind:value={$formData.category_id}>
											<Select.Trigger class="w-full">
												{selectedCategory?.name ?? 'Select a category'}
											</Select.Trigger>
											<Select.Content>
												{#each categories as category}
													<Select.Item value={category.id} label={category.name}
														>{category.name}</Select.Item
													>
												{/each}
											</Select.Content>
										</Select.Root>
									{:catch error}
										<p class="text-sm text-destructive">Error loading categories: {error.message}</p>
									{/await}
									{#if $errors.category_id}<span class="text-sm text-destructive"
											>{$errors.category_id[0]}</span
										>{/if}
								</div>
								<div class="grid gap-2">
									<Label for="supplier_id">Supplier</Label>
									{#await suppliersQuery}
										<Select.Root type="single" bind:value={$formData.supplier_id}>
											<Select.Trigger class="w-full">
												Loading suppliers...
											</Select.Trigger>
											<Select.Content>
												<!-- Loading state -->
											</Select.Content>
										</Select.Root>
									{:then suppliers}
										{@const selectedSupplier = suppliers.find(s => s.id === $formData.supplier_id)}
										<Select.Root type="single" bind:value={$formData.supplier_id}>
											<Select.Trigger class="w-full">
												{selectedSupplier?.name ?? 'Select a supplier'}
											</Select.Trigger>
											<Select.Content>
												{#each suppliers as supplier}
													<Select.Item value={supplier.id} label={supplier.name}
														>{supplier.name}</Select.Item
													>
												{/each}
											</Select.Content>
										</Select.Root>
									{:catch error}
										<p class="text-sm text-destructive">Error loading suppliers: {error.message}</p>
									{/await}

									{#if $errors.supplier_id}<span class="text-sm text-destructive"
											>{$errors.supplier_id[0]}</span
										>{/if}
								</div>
								<div class="grid grid-cols-2 gap-4">
									<div class="grid gap-2">
										<Label for="selling_price">Selling Price</Label>
										<Input
											id="selling_price"
											name="selling_price"
											type="number"
											step="0.01"
											bind:value={$formData.selling_price}
										/>
										{#if $errors.selling_price}<span class="text-sm text-destructive"
												>{$errors.selling_price[0]}</span
											>{/if}
									</div>
									<div class="grid gap-2">
										<Label for="cost_price">Cost Price</Label>
										<Input
											id="cost_price"
											name="cost_price"
											type="number"
											step="0.01"
											bind:value={$formData.cost_price}
										/>
										{#if $errors.cost_price}<span class="text-sm text-destructive"
												>{$errors.cost_price[0]}</span
											>{/if}
									</div>
								</div>
							</div>
						</div>
						<div class="col-span-1 space-y-2">
							<Label for="image_url">Image URL & Preview</Label>
							<Input id="image_url" name="image_url" bind:value={$formData.image_url} />
							<div
								class="aspect-square w-full bg-muted rounded-lg flex items-center justify-center"
							>
								{#if imageUrlPreview}
									<img
										src={imageUrlPreview}
										alt="Product preview"
										class="object-cover h-full w-full rounded-lg"
									/>
								{:else}
									<span class="text-sm text-muted-foreground">Image preview</span>
								{/if}
							</div>
							{#if $errors.image_url}<span class="text-sm text-destructive"
									>{$errors.image_url[0]}</span
								>{/if}
						</div>
					</div>
				</Tabs.Content>

				<Tabs.Content value="inventory" class="mt-6 space-y-6">
					<div class="p-4 border rounded-lg space-y-6 bg-muted/50">
						<div class="grid md:grid-cols-3 gap-6">
							<div class="grid gap-2">
								<Label for="reorder_point">Reorder Point</Label>
								<Input
									id="reorder_point"
									name="reorder_point"
									type="number"
									bind:value={$formData.reorder_point}
								/>
								{#if $errors.reorder_point}<span class="text-sm text-destructive"
										>{$errors.reorder_point[0]}</span
									>{/if}
							</div>
						</div>

						<div class="border-t pt-6">
							<div class="flex items-center space-x-2">
								<Switch.Root
									id="track-inventory"
									name="track_inventory"
									bind:checked={$formData.track_inventory}
								/>
								<Label for="track-inventory">Track Inventory</Label>
							</div>
							<p class="text-sm text-muted-foreground mt-2">
								If enabled, a batch number must be assigned when receiving stock and selected when
								selling.
							</p>
						</div>
					</div>
				</Tabs.Content>

				<Tabs.Content value="variants" class="mt-6 space-y-6">
					<div class="flex items-center space-x-2">
						<Switch.Root id="variants-enabled" bind:checked={enableVariants} />
						<Label for="variants-enabled">Enable Variants</Label>
					</div>

					{#if enableVariants}
						<div class="p-4 border rounded-lg space-y-4 bg-muted/50">
							<p class="text-sm text-muted-foreground">
								Define variant options and their values. For example, Option: "Size", Values: "S, M,
								L".
							</p>
							{#each variantOptions as option, i}
								<div class="grid grid-cols-10 gap-2 items-end">
									<div class="grid gap-1.5 col-span-3">
										<Label for={`option-name-${i}`}>Option</Label>
										<Input
											id={`option-name-${i}`}
											bind:value={option.name}
											placeholder="e.g. Color"
										/>
									</div>
									<div class="grid gap-1.5 col-span-6">
										<Label for={`option-values-${i}`}>Values (comma-separated)</Label>
										<Input
											id={`option-values-${i}`}
											bind:value={option.values}
											placeholder="e.g. Red, Green, Blue"
										/>
									</div>
									<div class="col-span-1">
										<Button
											variant="outline"
											size="icon"
											onclick={() => removeVariantOption(i)}
											disabled={variantOptions.length <= 1}
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									</div>
								</div>
							{/each}
							<Button variant="outline" size="sm" onclick={addVariantOption}
								>+ Add another option</Button
							>

							{#if generatedVariants.length > 0}
								<div class="pt-4 mt-4 border-t">
									<h4 class="font-semibold">Generated Variants ({generatedVariants.length})</h4>
									<div class="text-sm text-muted-foreground p-2 bg-background rounded-md mt-2">
										{#each generatedVariants as variant, i}
											<div
												class="flex items-center justify-between p-1 {i <
												generatedVariants.length - 1
													? 'border-b'
													: ''}"
											>
												<span>{$formData.name} - {Object.values(variant).join(' / ')}</span>
												<span class="font-mono text-xs bg-muted py-0.5 px-1 rounded"
													>SKU: {$formData.sku}-{Object.values(variant)
														.join('-')
														.toUpperCase()}</span
												>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</Tabs.Content>

				<Tabs.Content value="bundle" class="mt-6 space-y-6">
					<div class="flex items-center space-x-2">
						<Switch.Root id="bundle-enabled" bind:checked={enableBundle} />
						<Label for="bundle-enabled">Enable Product Bundle</Label>
					</div>

					{#if enableBundle}
						<div class="p-4 border rounded-lg space-y-4 bg-muted/50">
							<p class="text-sm text-muted-foreground">
								Search for products to add as components to this bundle.
							</p>
							<div class="relative">
								<Input placeholder="Search for products to add..." bind:value={bundleSearchTerm} />
								{#await productsQuery}
									<!-- Loading state -->
								{:then data}
									{@const filteredProducts = bundleSearchTerm.length > 2 
										? data.products.filter(p => 
											p.name.toLowerCase().includes(bundleSearchTerm.toLowerCase()) || 
											p.sku.toLowerCase().includes(bundleSearchTerm.toLowerCase())
										).slice(0, 10)
										: []}
									{#if filteredProducts.length > 0 && bundleSearchTerm}
										<div
											class="absolute z-10 w-full bg-background border rounded-md mt-1 max-h-60 overflow-y-auto"
										>
											{#each filteredProducts as product}
												<button
													type="button"
													onclick={() => addBundleComponent(product)}
													class="w-full text-left p-2 hover:bg-muted text-sm"
												>
													{product.name}
													<span class="text-xs text-muted-foreground">({product.sku})</span>
												</button>
											{/each}
										</div>
									{/if}
								{:catch error}
									<!-- Error state -->
								{/await}
							</div>

							{#if selectedComponents.length > 0}
								<div class="pt-4 mt-4 border-t">
									<h4 class="font-semibold">Bundle Components</h4>
									<div class="mt-2 space-y-2">
										{#each selectedComponents as component, i}
											<div
												class="flex items-center justify-between p-2 bg-background rounded-md border"
											>
												<div class="text-sm">
													<p class="font-medium">{component.name}</p>
													<p class="text-xs text-muted-foreground">SKU: {component.sku}</p>
												</div>
												<div class="flex items-center gap-2">
													<Label for={`component-qty-${i}`} class="text-xs">Qty:</Label>
													<Input
														type="number"
														id={`component-qty-${i}`}
														bind:value={component.quantity}
														class="w-20 h-8"
														min="1"
													/>
													<Button
														variant="outline"
														size="icon"
														onclick={() => removeBundleComponent(component.id)}
														class="h-8 w-8"
													>
														<Trash2 class="h-4 w-4" />
													</Button>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</Tabs.Content>
			</Tabs.Root>

			<Dialog.Footer class="mt-6 pt-4 border-t">
				<Button
					type="submit"
					onclick={() => (closeOnSave = false)}
					disabled={$allErrors.length > 0 || skuStatus === 'taken' || skuStatus === 'checking'}
					>Save & Add Another</Button
				>
				<Button
					type="submit"
					onclick={() => (closeOnSave = true)}
					disabled={$allErrors.length > 0 || skuStatus === 'taken' || skuStatus === 'checking'}
					>Save & Close</Button
				>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
