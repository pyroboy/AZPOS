-- Mock data for AZPOS Schema

-- Insert sample categories
INSERT INTO categories (name, code, description) 
SELECT 
  'Category ' || i,
  'CAT' || LPAD(i::text, 3, '0'),
  'Description for category ' || i
FROM generate_series(1, 10) AS i;

-- Insert sample suppliers
INSERT INTO suppliers (name, code, contact_person, email, phone, address, payment_terms, lead_time_days) 
SELECT 
  'Supplier ' || i,
  'SUP' || LPAD(i::text, 3, '0'),
  'Contact Person ' || i,
  'contact' || i || '@supplier.com',
  '555-' || LPAD(i::text, 4, '0'),
  i || ' Business Street, City, State 12345',
  CASE WHEN i % 3 = 0 THEN 'Net 30' WHEN i % 3 = 1 THEN 'Net 15' ELSE 'COD' END,
  (i % 14) + 7
FROM generate_series(1, 5) AS i;

-- Insert sample products with proper category and supplier references
INSERT INTO products (
  name, 
  sku, 
  description, 
  category_id, 
  supplier_id, 
  cost_price, 
  selling_price, 
  stock_quantity, 
  min_stock_level,
  max_stock_level,
  reorder_point,
  barcode,
  is_active, 
  is_archived,
  tags,
  weight,
  tax_rate,
  aisle_location
) 
SELECT 
  'Product ' || i,
  'SKU' || LPAD(i::text, 6, '0'),
  'High-quality product ' || i || ' with excellent features and durability.',
  (SELECT id FROM categories ORDER BY random() LIMIT 1),
  (SELECT id FROM suppliers ORDER BY random() LIMIT 1),
  ROUND((random() * 50 + 10)::numeric, 2), -- cost_price between $10-60
  ROUND((random() * 80 + 20)::numeric, 2), -- selling_price between $20-100
  FLOOR(random() * 100 + 1)::integer, -- stock_quantity 1-100
  FLOOR(random() * 10 + 5)::integer, -- min_stock_level 5-15
  FLOOR(random() * 50 + 100)::integer, -- max_stock_level 100-150
  FLOOR(random() * 15 + 10)::integer, -- reorder_point 10-25
  '12345678901' || LPAD(i::text, 2, '0'), -- barcode
  true,
  false,
  ARRAY['tag' || (i % 3 + 1), 'category' || (i % 4 + 1)], -- sample tags
  ROUND((random() * 5 + 0.1)::numeric, 2), -- weight 0.1-5.1 kg
  0.0825, -- 8.25% tax rate
  'A' || FLOOR(random() * 5 + 1) || '-' || FLOOR(random() * 20 + 1) -- aisle location
FROM generate_series(1, 50) AS i;

-- Insert inventory items for products
INSERT INTO inventory_items (product_id, location_id, quantity_on_hand, quantity_reserved, cost_per_unit) 
SELECT 
  p.id,
  l.id,
  p.stock_quantity,
  FLOOR(random() * 5)::integer, -- 0-4 reserved
  p.cost_price
FROM products p 
CROSS JOIN inventory_locations l
WHERE l.code = 'MAIN';

-- Insert some product batches for expiration tracking
INSERT INTO product_batches (product_id, batch_number, expiration_date, purchase_cost, quantity_on_hand)
SELECT 
  p.id,
  'BATCH-' || LPAD((ROW_NUMBER() OVER())::text, 6, '0'),
  CURRENT_DATE + INTERVAL '30 days' + (random() * INTERVAL '300 days'),
  p.cost_price,
  FLOOR(p.stock_quantity / 2)::integer
FROM products p
WHERE random() < 0.7; -- Only 70% of products have batches

-- Insert some inventory movements
INSERT INTO inventory_movements (
  product_id, 
  location_id, 
  movement_type, 
  transaction_type, 
  quantity, 
  unit_cost, 
  notes
)
SELECT 
  p.id,
  l.id,
  'in',
  'purchase',
  FLOOR(random() * 20 + 5)::integer,
  p.cost_price,
  'Initial stock purchase for product ' || p.name
FROM products p
CROSS JOIN inventory_locations l
WHERE l.code = 'MAIN' AND random() < 0.8;

-- Insert some purchase orders
INSERT INTO purchase_orders (po_number, supplier_id, status, order_date, expected_delivery_date, total_amount, notes)
SELECT 
  'PO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(i::text, 4, '0'),
  s.id,
  CASE 
    WHEN i % 4 = 0 THEN 'received'
    WHEN i % 4 = 1 THEN 'confirmed'
    WHEN i % 4 = 2 THEN 'sent'
    ELSE 'draft'
  END::po_status,
  CURRENT_DATE - (random() * INTERVAL '30 days'),
  CURRENT_DATE + (random() * INTERVAL '14 days'),
  ROUND((random() * 5000 + 500)::numeric, 2),
  'Purchase order ' || i || ' for supplier ' || s.name
FROM generate_series(1, 15) AS i
CROSS JOIN (SELECT id, name FROM suppliers ORDER BY random() LIMIT 1) s;

-- Insert purchase order items
INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity_ordered, quantity_received, unit_cost)
SELECT 
  po.id,
  p.id,
  FLOOR(random() * 20 + 5)::integer,
  CASE 
    WHEN po.status = 'received' THEN FLOOR(random() * 20 + 5)::integer
    WHEN po.status = 'partially_received' THEN FLOOR(random() * 10 + 2)::integer
    ELSE 0
  END,
  p.cost_price
FROM purchase_orders po
CROSS JOIN products p
WHERE random() < 0.3; -- Each PO has about 30% of products

-- Update purchase order totals based on items
UPDATE purchase_orders po
SET total_amount = (
  SELECT COALESCE(SUM(poi.quantity_ordered * poi.unit_cost), 0)
  FROM purchase_order_items poi
  WHERE poi.purchase_order_id = po.id
);
