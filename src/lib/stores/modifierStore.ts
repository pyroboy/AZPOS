import { writable, get } from 'svelte/store';
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

// Store for managing modifiers
function createModifierStore() {
    const { subscribe, set, update } = writable<Modifier[]>([]);

    return {
        subscribe,
        set,
        
        addModifier: (modifier: Omit<Modifier, 'id' | 'created_at'>) => {
            const newModifier: Modifier = {
                id: crypto.randomUUID(),
                created_at: new Date().toISOString(),
                ...modifier
            };
            update((modifiers) => [...modifiers, newModifier]);
        },

        updateModifier: (updatedModifier: Modifier) => {
            update((modifiers) =>
                modifiers.map((m) => (m.id === updatedModifier.id ? updatedModifier : m))
            );
        },

        deleteModifier: (id: string) => {
            update((modifiers) => modifiers.filter((m) => m.id !== id));
        },

        toggleModifierStatus: (id: string) => {
            update((modifiers) =>
                modifiers.map((m) => 
                    m.id === id ? { ...m, is_active: !m.is_active } : m
                )
            );
        },

        getActiveModifiers: () => {
            let activeModifiers: Modifier[] = [];
            subscribe((modifiers) => {
                activeModifiers = modifiers.filter(m => m.is_active);
            })();
            return activeModifiers;
        },

        reset: () => set([])
    };
}

// Store for managing product-modifier associations
function createProductModifierStore() {
    const { subscribe, set, update } = writable<ProductModifier[]>([]);

    return {
        subscribe,
        set,

        addProductModifier: (productModifier: Omit<ProductModifier, 'id'>) => {
            const newProductModifier: ProductModifier = {
                id: crypto.randomUUID(),
                ...productModifier
            };
            update((associations) => [...associations, newProductModifier]);
        },

        removeProductModifier: (productId: string, modifierId: string) => {
            update((associations) => 
                associations.filter(a => !(a.product_id === productId && a.modifier_id === modifierId))
            );
        },



        updateProductModifier: (updatedAssociation: ProductModifier) => {
            update((associations) =>
                associations.map((a) => (a.id === updatedAssociation.id ? updatedAssociation : a))
            );
        },

        reset: () => set([])
    };
}

export const modifiers = createModifierStore();
export const productModifiers = createProductModifierStore();

/**
 * Retrieves all active modifiers for a specific product.
 * @param productId The ID of the product.
 * @returns An array of Modifier objects.
 */
export function getModifiersForProduct(productId: string): Modifier[] {
    const allModifiers = get(modifiers);
    const associations = get(productModifiers).filter(pm => pm.product_id === productId);
    const modifierIds = new Set(associations.map(a => a.modifier_id));
    
    return allModifiers.filter(m => modifierIds.has(m.id) && m.is_active);
}
