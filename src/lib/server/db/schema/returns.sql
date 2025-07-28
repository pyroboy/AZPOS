-- Returns table for managing product returns
CREATE TABLE IF NOT EXISTS returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  items JSONB NOT NULL, -- Array of return items with product details
  return_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'processing', 'cancelled')),
  reason TEXT NOT NULL CHECK (reason IN ('defective', 'wrong_item', 'changed_mind', 'other', 'no_longer_needed')),
  notes TEXT,
  admin_notes TEXT,
  processed_by UUID REFERENCES auth.users(id), -- Admin who processed the return
  processed_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id), -- User who created the return (for RBAC)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_returns_status ON returns(status);
CREATE INDEX IF NOT EXISTS idx_returns_user_id ON returns(user_id);
CREATE INDEX IF NOT EXISTS idx_returns_order_id ON returns(order_id);
CREATE INDEX IF NOT EXISTS idx_returns_created_at ON returns(created_at);
CREATE INDEX IF NOT EXISTS idx_returns_processed_by ON returns(processed_by);
CREATE INDEX IF NOT EXISTS idx_returns_reason ON returns(reason);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_returns_status_created_at ON returns(status, created_at);
CREATE INDEX IF NOT EXISTS idx_returns_user_status ON returns(user_id, status);

-- RLS (Row Level Security) policies
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own returns, admins/managers can view all
CREATE POLICY "Users can view own returns, admins view all" ON returns
  FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- Policy: Users can create returns for their own orders
CREATE POLICY "Users can create returns" ON returns
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- Policy: Only admins/managers can update return status
CREATE POLICY "Only admins can update returns" ON returns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- Policy: Only admins/managers can delete (soft delete via status update)
CREATE POLICY "Only admins can delete returns" ON returns
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'role' IN ('admin', 'manager')
    )
  );

-- Trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_returns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_returns_updated_at
  BEFORE UPDATE ON returns
  FOR EACH ROW
  EXECUTE FUNCTION update_returns_updated_at();

-- Function to validate return items structure
CREATE OR REPLACE FUNCTION validate_return_items(items JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if items is an array
  IF jsonb_typeof(items) != 'array' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if array is not empty
  IF jsonb_array_length(items) = 0 THEN
    RETURN FALSE;
  END IF;
  
  -- Validate each item has required fields
  IF NOT (
    SELECT bool_and(
      item ? 'product_id' AND 
      item ? 'product_name' AND 
      item ? 'product_sku' AND 
      item ? 'quantity' AND
      (item->>'quantity')::numeric > 0
    )
    FROM jsonb_array_elements(items) AS item
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add constraint to validate return items structure
ALTER TABLE returns 
ADD CONSTRAINT check_return_items_valid 
CHECK (validate_return_items(items));

-- Function to get return statistics (for admin dashboard)
CREATE OR REPLACE FUNCTION get_return_statistics()
RETURNS TABLE (
  total_returns BIGINT,
  pending_count BIGINT,
  approved_count BIGINT,
  rejected_count BIGINT,
  completed_count BIGINT,
  processing_count BIGINT,
  avg_processing_time_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_returns,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE status = 'processing') as processing_count,
    AVG(
      CASE 
        WHEN processed_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (processed_at - created_at)) / 3600.0 
        ELSE NULL 
      END
    ) as avg_processing_time_hours
  FROM returns
  WHERE status != 'cancelled';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON returns TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Comments for documentation
COMMENT ON TABLE returns IS 'Product returns management with approval workflow';
COMMENT ON COLUMN returns.items IS 'JSONB array of return items with product details and quantities';
COMMENT ON COLUMN returns.status IS 'Return status: pending, approved, rejected, completed, processing, cancelled';
COMMENT ON COLUMN returns.reason IS 'Reason for return: defective, wrong_item, changed_mind, other, no_longer_needed';
COMMENT ON COLUMN returns.processed_by IS 'Admin user who processed the return';
COMMENT ON COLUMN returns.user_id IS 'User who created the return (for RBAC and filtering)';

-- Sample data for testing (optional - remove in production)
-- INSERT INTO returns (order_id, customer_name, items, reason, notes, user_id) VALUES
-- ('ORD-001', 'John Doe', '[{"product_id": "prod-1", "product_name": "Test Product", "product_sku": "SKU-001", "quantity": 1}]', 'defective', 'Product arrived damaged', auth.uid());
