import type { Modifier } from '$lib/schemas/models';

export interface ProductModifier {
	id: string;
	product_id: string;
	modifier_id: string;
	is_required: boolean;
	display_order: number;
}

export interface OrderItemModifier {
	id: string;
	order_item_id: string;
	modifier_id: string;
	modifier_name: string;
	price_adjustment: number;
}

function createModifierStore() {
	// 1. Use $state for both modifiers and product-modifier associations
	const modifiers = $state<Modifier[]>([]);
	const productModifiers = $state<ProductModifier[]>([]);

	// 2. Use $derived for computed values
	const activeModifiers = $derived(modifiers.filter((m) => m.is_active));

	// Modifier management functions
	function addModifier(modifier: Omit<Modifier, 'id' | 'created_at'>) {
		const newModifier: Modifier = {
			id: crypto.randomUUID(),
			created_at: new Date().toISOString(),
			...modifier
		};
		modifiers.push(newModifier);
	}

	function updateModifier(updatedModifier: Modifier) {
		const index = modifiers.findIndex((m) => m.id === updatedModifier.id);
		if (index !== -1) {
			modifiers[index] = updatedModifier;
		}
	}

	function deleteModifier(id: string) {
		const index = modifiers.findIndex((m) => m.id === id);
		if (index !== -1) {
			modifiers.splice(index, 1);
		}
	}

	function toggleModifierStatus(id: string) {
		const index = modifiers.findIndex((m) => m.id === id);
		if (index !== -1) {
			modifiers[index] = {
				...modifiers[index],
				is_active: !modifiers[index].is_active
			};
		}
	}

	// Product-modifier association functions
	function addProductModifier(productModifier: Omit<ProductModifier, 'id'>) {
		const newProductModifier: ProductModifier = {
			id: crypto.randomUUID(),
			...productModifier
		};
		productModifiers.push(newProductModifier);
	}

	function removeProductModifier(productId: string, modifierId: string) {
		const index = productModifiers.findIndex(
			(a) => a.product_id === productId && a.modifier_id === modifierId
		);
		if (index !== -1) {
			productModifiers.splice(index, 1);
		}
	}

	function updateProductModifier(updatedAssociation: ProductModifier) {
		const index = productModifiers.findIndex((a) => a.id === updatedAssociation.id);
		if (index !== -1) {
			productModifiers[index] = updatedAssociation;
		}
	}

	function getModifiersForProduct(productId: string): Modifier[] {
		const associations = productModifiers.filter((pm) => pm.product_id === productId);
		const modifierIds = new Set(associations.map((a) => a.modifier_id));

		return modifiers.filter((m) => modifierIds.has(m.id) && m.is_active);
	}

	function resetModifiers() {
		modifiers.length = 0;
	}

	function resetProductModifiers() {
		productModifiers.length = 0;
	}

	// Return the public API
	return {
		// Expose state via getters
		get modifiers() {
			return modifiers;
		},
		get productModifiers() {
			return productModifiers;
		},
		get activeModifiers() {
			return activeModifiers;
		},

		// Expose modifier functions
		addModifier,
		updateModifier,
		deleteModifier,
		toggleModifierStatus,
		resetModifiers,

		// Expose product-modifier association functions
		addProductModifier,
		removeProductModifier,
		updateProductModifier,
		resetProductModifiers,

		// Utility functions
		getModifiersForProduct
	};
}

export const modifierStore = createModifierStore();
