-- Cart tables for TanStack Query + Telefunc architecture

-- Main carts table (for cart-level data like discounts)
CREATE TABLE IF NOT EXISTS carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT, -- For guest users
  discount JSONB, -- Store discount info as JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure either user_id or session_id is present
  CONSTRAINT cart_user_or_session CHECK (
    (user_id IS NOT NULL AND session_id IS NULL) OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  ),
  
  -- Unique constraint per user/session
  UNIQUE(user_id),
  UNIQUE(session_id)
);

-- Cart items table
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT, -- For guest users
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  selected_modifiers JSONB DEFAULT '[]'::jsonb, -- Array of modifier objects
  applied_discounts JSONB DEFAULT '[]'::jsonb, -- Array of discount objects
  subtotal DECIMAL(10,2) NOT NULL,
  final_price DECIMAL(10,2) NOT NULL, -- Price per item after modifiers
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure either user_id or session_id is present
  CONSTRAINT cart_item_user_or_session CHECK (
    (user_id IS NOT NULL AND session_id IS NULL) OR 
    (user_id IS NULL AND session_id IS NOT NULL)
  ),
  
  -- Prevent duplicate products in same cart
  UNIQUE(user_id, product_id),
  UNIQUE(session_id, product_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_session_id ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX IF NOT EXISTS idx_carts_user_id ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_session_id ON carts(session_id);

-- Row Level Security (RLS) policies
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Users can only access their own cart data
CREATE POLICY "Users can view own cart" ON carts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart" ON carts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart" ON carts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart" ON carts
  FOR DELETE USING (auth.uid() = user_id);

-- Cart items policies
CREATE POLICY "Users can view own cart items" ON cart_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cart items" ON cart_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart items" ON cart_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart items" ON cart_items
  FOR DELETE USING (auth.uid() = user_id);

-- Guest users (session-based) policies
-- Note: In production, you might want more restrictive policies for guest access
CREATE POLICY "Guest users can manage session cart" ON carts
  FOR ALL USING (session_id IS NOT NULL AND auth.uid() IS NULL);

CREATE POLICY "Guest users can manage session cart items" ON cart_items
  FOR ALL USING (session_id IS NOT NULL AND auth.uid() IS NULL);

-- Triggers to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_carts_updated_at 
  BEFORE UPDATE ON carts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at 
  BEFORE UPDATE ON cart_items 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
