import { getContext } from 'telefunc';
import { 
  addCartItemSchema, 
  updateCartItemSchema, 
  cartDiscountSchema,
  type CartState, 
  type EnhancedCartItem,
  type CartTotals 
} from '$lib/types/cart.schema';
import { createSupabaseClient } from '$lib/server/db';
import { v4 as uuidv4 } from 'uuid';

// Telefunc to get current cart state
export async function onGetCart(sessionId?: string): Promise<CartState> {
  const { user } = getContext();
  const supabase = createSupabaseClient();

  // For authenticated users, get cart by user_id
  // For guests, get cart by session_id
  const query = supabase.from('cart_items').select(`
    *,
    products (
      name,
      sku,
      price,
      image_url
    )
  `);

  if (user) {
    query.eq('user_id', user.id);
  } else if (sessionId) {
    query.eq('session_id', sessionId);
  } else {
    // Return empty cart for new sessions
    return {
      items: [],
      discount: null,
      session_id: uuidv4(),
      last_updated: new Date().toISOString()
    };
  }

  const { data: cartItems, error } = await query;
  if (error) throw error;

  // Transform database items to cart items
  const items: EnhancedCartItem[] = cartItems?.map(item => ({
    cart_item_id: item.id,
    product_id: item.product_id,
    product_name: item.products.name,
    product_sku: item.products.sku,
    base_price: item.products.price,
    quantity: item.quantity,
    selected_modifiers: item.selected_modifiers || [],
    applied_discounts: item.applied_discounts || [],
    subtotal: item.subtotal,
    final_price: item.final_price,
    image_url: item.products.image_url,
    added_at: item.created_at,
    updated_at: item.updated_at,
    notes: item.notes
  })) || [];

  // Get cart-level discount if exists
  const { data: cartData } = await supabase
    .from('carts')
    .select('discount, session_id, updated_at')
    .eq(user ? 'user_id' : 'session_id', user?.id || sessionId)
    .single();

  return {
    items,
    discount: cartData?.discount || null,
    session_id: cartData?.session_id || sessionId || uuidv4(),
    last_updated: cartData?.updated_at || new Date().toISOString(),
    user_id: user?.id
  };
}

// Telefunc to add item to cart
export async function onAddCartItem(itemData: unknown, sessionId?: string): Promise<EnhancedCartItem> {
  const { user } = getContext();
  const validatedData = addCartItemSchema.parse(itemData);
  const supabase = createSupabaseClient();

  // Get product details
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', validatedData.product_id)
    .single();

  if (productError || !product) {
    throw new Error('Product not found');
  }

  // Calculate pricing with modifiers
  let modifierTotal = 0;
  if (validatedData.selected_modifiers) {
    modifierTotal = validatedData.selected_modifiers.reduce(
      (sum, mod) => sum + mod.price_adjustment, 
      0
    );
  }

  const finalPrice = product.price + modifierTotal;
  const subtotal = finalPrice * validatedData.quantity;

  // Check if item already exists in cart
  const existingQuery = supabase
    .from('cart_items')
    .select('*')
    .eq('product_id', validatedData.product_id);

  if (user) {
    existingQuery.eq('user_id', user.id);
  } else {
    existingQuery.eq('session_id', sessionId);
  }

  const { data: existingItems } = await existingQuery;
  
  if (existingItems && existingItems.length > 0) {
    // Update existing item quantity
    const existingItem = existingItems[0];
    const newQuantity = existingItem.quantity + validatedData.quantity;
    const newSubtotal = finalPrice * newQuantity;

    const { data: updatedItem, error } = await supabase
      .from('cart_items')
      .update({
        quantity: newQuantity,
        subtotal: newSubtotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingItem.id)
      .select()
      .single();

    if (error) throw error;

    return {
      cart_item_id: updatedItem.id,
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      base_price: product.price,
      quantity: newQuantity,
      selected_modifiers: validatedData.selected_modifiers || [],
      applied_discounts: [],
      subtotal: newSubtotal,
      final_price: finalPrice,
      image_url: product.image_url,
      added_at: existingItem.created_at,
      updated_at: updatedItem.updated_at,
      notes: validatedData.notes
    };
  } else {
    // Create new cart item
    const { data: newItem, error } = await supabase
      .from('cart_items')
      .insert({
        product_id: validatedData.product_id,
        quantity: validatedData.quantity,
        selected_modifiers: validatedData.selected_modifiers,
        subtotal,
        final_price: finalPrice,
        notes: validatedData.notes,
        user_id: user?.id,
        session_id: sessionId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return {
      cart_item_id: newItem.id,
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      base_price: product.price,
      quantity: validatedData.quantity,
      selected_modifiers: validatedData.selected_modifiers || [],
      applied_discounts: [],
      subtotal,
      final_price: finalPrice,
      image_url: product.image_url,
      added_at: newItem.created_at,
      updated_at: newItem.updated_at,
      notes: validatedData.notes
    };
  }
}

// Telefunc to update cart item quantity
export async function onUpdateCartItem(updateData: unknown): Promise<void> {
  const { user } = getContext();
  const validatedData = updateCartItemSchema.parse(updateData);
  const supabase = createSupabaseClient();

  if (validatedData.quantity === 0) {
    // Remove item from cart
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', validatedData.cart_item_id);
    
    if (error) throw error;
  } else {
    // Update item quantity
    const { error } = await supabase
      .from('cart_items')
      .update({
        quantity: validatedData.quantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', validatedData.cart_item_id);
    
    if (error) throw error;
  }
}

// Telefunc to apply discount to cart
export async function onApplyCartDiscount(discountData: unknown, sessionId?: string): Promise<void> {
  const { user } = getContext();
  const validatedDiscount = cartDiscountSchema.parse(discountData);
  const supabase = createSupabaseClient();

  // Upsert cart record with discount
  const { error } = await supabase
    .from('carts')
    .upsert({
      user_id: user?.id,
      session_id: sessionId,
      discount: validatedDiscount,
      updated_at: new Date().toISOString()
    });

  if (error) throw error;
}

// Telefunc to clear cart
export async function onClearCart(sessionId?: string): Promise<void> {
  const { user } = getContext();
  const supabase = createSupabaseClient();

  // Delete all cart items
  const deleteQuery = supabase.from('cart_items').delete();
  
  if (user) {
    deleteQuery.eq('user_id', user.id);
  } else {
    deleteQuery.eq('session_id', sessionId);
  }

  const { error } = await deleteQuery;
  if (error) throw error;

  // Clear cart-level data
  const { error: cartError } = await supabase
    .from('carts')
    .delete()
    .eq(user ? 'user_id' : 'session_id', user?.id || sessionId);

  if (cartError) throw cartError;
}

// Telefunc to calculate cart totals
export async function onCalculateCartTotals(sessionId?: string): Promise<CartTotals> {
  const cartState = await onGetCart(sessionId);
  
  const subtotal = cartState.items.reduce((acc, item) => acc + item.subtotal, 0);
  
  let discount_amount = 0;
  if (cartState.discount) {
    if (cartState.discount.type === 'percentage') {
      discount_amount = subtotal * (cartState.discount.value / 100);
    } else {
      discount_amount = cartState.discount.value;
    }
  }
  
  const taxableAmount = subtotal - discount_amount;
  const tax = taxableAmount * 0.12; // 12% VAT
  const total = taxableAmount + tax;
  const item_count = cartState.items.reduce((acc, item) => acc + item.quantity, 0);
  
  return {
    subtotal,
    discount_amount,
    tax,
    total,
    item_count
  };
}
