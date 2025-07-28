import { writable, get, derived } from 'svelte/store';
import type { Product, ProductBatch, Modifier } from '$lib/schemas/models';
import type { Writable, Readable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';

// Enhanced CartItem interface aligned with CustomerCartItemSchema
export interface EnhancedCartItem {
	cart_item_id: string;
	product_id: string;
	product_name: string;
	product_sku: string;
	base_price: number;
	quantity: number;
	selected_modifiers?: Array<{
		modifier_id: string;
		modifier_name: string;
		price_adjustment: number;
	}>;
	applied_discounts?: Array<{
		discount_id: string;
		discount_name: string;
		discount_amount: number;
	}>;
	subtotal: number;
	final_price: number;
	image_url?: string;
	added_at: string;
	updated_at: string;
	notes?: string;
}

export interface CartState {
	[x: string]: any;
	items: EnhancedCartItem[];
	discount: { type: 'percentage' | 'fixed'; value: number } | null;
	session_id?: string;
	last_updated?: string;
}

export interface CartTotals {
	subtotal: number;
	discount_amount: number;
	tax: number;
	total: number;
	item_count: number;
}

export interface CartStore extends Writable<CartState> {
  addItem: (product: Product, batch: ProductBatch, quantity: number, modifiers?: Modifier[], notes?: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateItemPrice: (cartItemId: string, newPrice: number) => void;
  updateNotes: (cartItemId: string, notes: string) => void;
  applyDiscount: (discount: { type: 'percentage' | 'fixed'; value: number }) => void;
  removeDiscount: () => void;
  clear: () => void;
  clearCart: () => void; // Backward compatibility
  totals: Readable<CartTotals>;
  syncWithServer: () => Promise<void>;
  loadFromSession: () => void;
  saveToSession: () => void;
  finalizeCart: () => {
    subtotal: number;
    discount_amount: number;
    tax: number;
    total: number;
    items: EnhancedCartItem[];
  };
}

function createCartStore(): CartStore {
  const STORAGE_KEY = 'azpos_cart_session';
  
  // Load initial state from session storage
  const loadInitialState = (): CartState => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Validate and sanitize stored data
          if (parsed.items && Array.isArray(parsed.items)) {
            return {
              items: parsed.items,
              discount: parsed.discount || null,
              session_id: parsed.session_id || uuidv4(),
              last_updated: parsed.last_updated || new Date().toISOString()
            };
          }
        }
      } catch (error) {
        console.warn('Failed to load cart from session storage:', error);
      }
    }
    
    return {
      items: [],
      discount: null,
      session_id: uuidv4(),
      last_updated: new Date().toISOString()
    };
  };

  const store = writable<CartState>(loadInitialState());
  const { subscribe, set, update } = store;

  // Create reactive totals using derived store
  const totals = derived(store, ($store): CartTotals => {
    const subtotal = $store.items.reduce((acc, item) => acc + item.subtotal, 0);
    
    let discount_amount = 0;
    if ($store.discount) {
      if ($store.discount.type === 'percentage') {
        discount_amount = subtotal * ($store.discount.value / 100);
      } else {
        discount_amount = $store.discount.value;
      }
    }
    
    const taxableAmount = subtotal - discount_amount;
    const tax = taxableAmount * 0.12; // 12% VAT
    const total = taxableAmount + tax;
    const item_count = $store.items.reduce((acc, item) => acc + item.quantity, 0);
    
    return {
      subtotal,
      discount_amount,
      tax,
      total,
      item_count
    };
  });

  // Save to session storage
  const saveToSession = () => {
    if (typeof window !== 'undefined') {
      try {
        const currentState = get(store);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
      } catch (error) {
        console.warn('Failed to save cart to session storage:', error);
      }
    }
  };

  // Load from session storage
  const loadFromSession = () => {
    const initialState = loadInitialState();
    set(initialState);
  };

  // Auto-save on state changes
  subscribe(() => {
    saveToSession();
  });

  return {
    subscribe,
    set,
    update,
    totals,
    addItem: (product: Product, batch: ProductBatch, quantity: number, modifiers: Modifier[] = [], notes?: string) => {
      update((state) => {
        // Validate quantity (max 999 as per schema)
        const validQuantity = Math.min(Math.max(1, quantity), 999);
        
        const modifierIds = modifiers.map((m) => m.id).sort().join(',');
        const existingItem = state.items.find(
          (item) =>
            item.product_id === product.id &&
            item.selected_modifiers?.map((m) => m.modifier_id).sort().join(',') === modifierIds
        );

        const now = new Date().toISOString();
        const modifierPrice = modifiers.reduce((sum, m) => sum + (m.price_adjustment || 0), 0);
        const itemSubtotal = (product.price + modifierPrice) * validQuantity;

        if (existingItem) {
          const newQuantity = Math.min(existingItem.quantity + validQuantity, 999);
          const updatedItems = state.items.map((item) =>
            item.cart_item_id === existingItem.cart_item_id
              ? { 
                  ...item, 
                  quantity: newQuantity,
                  subtotal: (product.price + modifierPrice) * newQuantity,
                  final_price: (product.price + modifierPrice) * newQuantity,
                  updated_at: now,
                  notes: notes || item.notes
                }
              : item
          );
          
          return {
            ...state,
            items: updatedItems,
            last_updated: now
          };
        } else {
          const newItem: EnhancedCartItem = {
            cart_item_id: uuidv4(),
            product_id: product.id,
            product_name: product.name,
            product_sku: product.sku,
            base_price: product.price,
            quantity: validQuantity,
            selected_modifiers: modifiers.map((m) => ({
              modifier_id: m.id,
              modifier_name: m.name,
              price_adjustment: m.price_adjustment || 0
            })),
            applied_discounts: [],
            subtotal: itemSubtotal,
            final_price: itemSubtotal,
            image_url: product.image_url,
            added_at: now,
            updated_at: now,
            notes: notes
          };

          return {
            ...state,
            items: [...state.items, newItem],
            last_updated: now
          };
        }
      });
    },

    removeItem: (cartItemId: string) => {
      update((state) => ({
        ...state,
        items: state.items.filter((item) => item.cart_item_id !== cartItemId),
        last_updated: new Date().toISOString()
      }));
    },

    updateQuantity: (cartItemId: string, quantity: number) => {
      update((state) => {
        const validQuantity = Math.min(Math.max(1, quantity), 999);
        const now = new Date().toISOString();
        
        const updatedItems = state.items.map((item) => {
          if (item.cart_item_id === cartItemId) {
            const modifierPrice = item.selected_modifiers?.reduce((sum, m) => sum + m.price_adjustment, 0) || 0;
            const newSubtotal = (item.base_price + modifierPrice) * validQuantity;
            
            return {
              ...item,
              quantity: validQuantity,
              subtotal: newSubtotal,
              final_price: newSubtotal,
              updated_at: now
            };
          }
          return item;
        });

        return {
          ...state,
          items: updatedItems,
          last_updated: now
        };
      });
    },

    updateItemPrice: (cartItemId: string, newPrice: number) => {
      update((state) => {
        const now = new Date().toISOString();
        const updatedItems = state.items.map((item) => {
          if (item.cart_item_id === cartItemId) {
            const modifierPrice = item.selected_modifiers?.reduce((sum, m) => sum + m.price_adjustment, 0) || 0;
            const newSubtotal = (newPrice + modifierPrice) * item.quantity;
            
            return {
              ...item,
              base_price: newPrice,
              subtotal: newSubtotal,
              final_price: newSubtotal,
              updated_at: now
            };
          }
          return item;
        });

        return {
          ...state,
          items: updatedItems,
          last_updated: now
        };
      });
    },

    updateNotes: (cartItemId: string, notes: string) => {
      update((state) => {
        // Validate notes length (max 500 chars as per schema)
        const validNotes = notes.length > 500 ? notes.substring(0, 500) : notes;
        const now = new Date().toISOString();
        
        const updatedItems = state.items.map((item) =>
          item.cart_item_id === cartItemId
            ? { ...item, notes: validNotes, updated_at: now }
            : item
        );

        return {
          ...state,
          items: updatedItems,
          last_updated: now
        };
      });
    },

    applyDiscount: (discount: { type: 'percentage' | 'fixed'; value: number }) => {
      update((state) => ({
        ...state,
        discount,
        last_updated: new Date().toISOString()
      }));
    },

    removeDiscount: () => {
      update((state) => ({
        ...state,
        discount: null,
        last_updated: new Date().toISOString()
      }));
    },

    clear: () => {
      const newState: CartState = {
        items: [],
        discount: null,
        session_id: uuidv4(),
        last_updated: new Date().toISOString()
      };
      set(newState);
    },

    clearCart: () => {
      // Backward compatibility method
      const newState: CartState = {
        items: [],
        discount: null,
        session_id: uuidv4(),
        last_updated: new Date().toISOString()
      };
      set(newState);
    },

    syncWithServer: async () => {
      // In a real implementation, this would sync with the server
      // For now, just update the timestamp
      update((state) => ({
        ...state,
        last_updated: new Date().toISOString()
      }));
    },

    finalizeCart: () => {
      const currentState = get(store);
      const currentTotals = get(totals);

      return {
        subtotal: currentTotals.subtotal,
        discount_amount: currentTotals.discount_amount,
        tax: currentTotals.tax,
        total: currentTotals.total,
        items: currentState.items
      };
    },

    loadFromSession,
    saveToSession
	};
}

export const cart: CartStore = createCartStore();
