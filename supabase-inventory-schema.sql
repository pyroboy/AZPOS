-- =============================================
-- AZPOS Inventory Management System
-- Supabase SQL Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. CATEGORIES & SUPPLIERS
-- =============================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    tax_id VARCHAR(100),
    payment_terms VARCHAR(100),
    lead_time_days INTEGER DEFAULT 7,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 2. PRODUCTS
-- =============================================

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    cost_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    selling_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER,
    reorder_point INTEGER DEFAULT 0,
    barcode VARCHAR(255),
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_archived BOOLEAN DEFAULT FALSE,
    is_bundle BOOLEAN DEFAULT FALSE,
    tags TEXT[], -- Array of tags
    weight DECIMAL(8,3), -- in kg
    dimensions JSONB, -- {length, width, height}
    tax_rate DECIMAL(5,4) DEFAULT 0, -- 0.0825 for 8.25%
    discount_eligible BOOLEAN DEFAULT TRUE,
    track_inventory BOOLEAN DEFAULT TRUE,
    aisle_location VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Bundle components (for bundled products)
CREATE TABLE bundle_components (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bundle_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    component_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(bundle_product_id, component_product_id)
);

-- Product variants (size, color, etc.)
CREATE TABLE product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_type VARCHAR(50) NOT NULL, -- 'size', 'color', 'style', etc.
    variant_value VARCHAR(100) NOT NULL, -- 'Large', 'Red', etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 3. INVENTORY LOCATIONS
-- =============================================

CREATE TABLE inventory_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default location
INSERT INTO inventory_locations (name, code, description) 
VALUES ('Main Warehouse', 'MAIN', 'Primary inventory location');

-- =============================================
-- 4. PRODUCT BATCHES (for expiration tracking)
-- =============================================

CREATE TABLE product_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    expiration_date TIMESTAMPTZ,
    purchase_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, batch_number)
);

-- =============================================
-- 5. INVENTORY ITEMS (current stock levels)
-- =============================================

CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID REFERENCES inventory_locations(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    quantity_on_hand INTEGER NOT NULL DEFAULT 0,
    quantity_reserved INTEGER NOT NULL DEFAULT 0,
    quantity_available INTEGER GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
    cost_per_unit DECIMAL(10,2) NOT NULL DEFAULT 0,
    last_counted_at TIMESTAMPTZ,
    last_movement_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, location_id, batch_id)
);

-- =============================================
-- 6. INVENTORY MOVEMENTS (transaction log)
-- =============================================

CREATE TYPE movement_type AS ENUM ('in', 'out', 'transfer', 'adjustment', 'count');
CREATE TYPE transaction_type AS ENUM ('purchase', 'sale', 'return', 'adjustment', 'transfer', 'count', 'damage', 'expired');
CREATE TYPE reference_type AS ENUM ('order', 'return', 'purchase_order', 'adjustment', 'transfer', 'count');

CREATE TABLE inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    movement_type movement_type NOT NULL,
    transaction_type transaction_type NOT NULL,
    quantity INTEGER NOT NULL, -- Positive for 'in', negative for 'out'
    unit_cost DECIMAL(10,2),
    reference_id UUID, -- Links to orders, returns, etc.
    reference_type reference_type,
    notes TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 7. PURCHASE ORDERS
-- =============================================

CREATE TYPE po_status AS ENUM ('draft', 'sent', 'confirmed', 'partially_received', 'received', 'cancelled');

CREATE TABLE purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    po_number VARCHAR(100) UNIQUE NOT NULL,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    status po_status DEFAULT 'draft',
    order_date TIMESTAMPTZ DEFAULT NOW(),
    expected_delivery_date TIMESTAMPTZ,
    total_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2) NOT NULL,
    total_cost DECIMAL(10,2) GENERATED ALWAYS AS (quantity_ordered * unit_cost) STORED,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 8. RECEIVING (PO fulfillment)
-- =============================================

CREATE TYPE receiving_status AS ENUM ('pending', 'in_progress', 'completed', 'discrepancy');

CREATE TABLE receiving_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    status receiving_status DEFAULT 'pending',
    carrier VARCHAR(255),
    tracking_number VARCHAR(255),
    package_condition VARCHAR(100),
    photos TEXT[], -- Array of photo URLs
    received_by UUID REFERENCES auth.users(id),
    received_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE receiving_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receiving_session_id UUID REFERENCES receiving_sessions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity_expected INTEGER NOT NULL,
    quantity_received INTEGER NOT NULL,
    variance INTEGER GENERATED ALWAYS AS (quantity_received - quantity_expected) STORED,
    batch_number VARCHAR(100),
    expiration_date TIMESTAMPTZ,
    condition VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 9. RETURNS
-- =============================================

CREATE TYPE return_status AS ENUM ('pending', 'approved', 'rejected', 'processed');
CREATE TYPE return_reason AS ENUM ('damaged', 'defective', 'wrong_item', 'expired', 'customer_request', 'other');

CREATE TABLE returns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_number VARCHAR(100) UNIQUE NOT NULL,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    status return_status DEFAULT 'pending',
    reason return_reason NOT NULL,
    description TEXT,
    total_refund_amount DECIMAL(10,2) DEFAULT 0,
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE return_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    return_id UUID REFERENCES returns(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    refund_amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    condition VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 10. STOCK COUNTS / AUDITS
-- =============================================

CREATE TYPE count_status AS ENUM ('planned', 'in_progress', 'completed', 'cancelled');

CREATE TABLE stock_counts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    count_number VARCHAR(100) UNIQUE NOT NULL,
    location_id UUID REFERENCES inventory_locations(id) ON DELETE SET NULL,
    status count_status DEFAULT 'planned',
    count_date TIMESTAMPTZ DEFAULT NOW(),
    counted_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_count_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stock_count_id UUID REFERENCES stock_counts(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    expected_quantity INTEGER NOT NULL,
    counted_quantity INTEGER NOT NULL,
    variance INTEGER GENERATED ALWAYS AS (counted_quantity - expected_quantity) STORED,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 11. INVENTORY ALERTS
-- =============================================

CREATE TYPE alert_type AS ENUM ('low_stock', 'out_of_stock', 'expired', 'expiring_soon', 'overstock');

CREATE TABLE inventory_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    alert_type alert_type NOT NULL,
    threshold_value INTEGER,
    current_value INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 12. MODIFIERS (add-ons, customizations)
-- =============================================

CREATE TABLE modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price_adjustment DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE product_modifiers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    modifier_id UUID REFERENCES modifiers(id) ON DELETE CASCADE,
    is_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(product_id, modifier_id)
);

-- =============================================
-- 13. INDEXES FOR PERFORMANCE
-- =============================================

-- Products
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_supplier ON products(supplier_id);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_active ON products(is_active, is_archived);
CREATE INDEX idx_products_stock ON products(stock_quantity);

-- Inventory Items
CREATE INDEX idx_inventory_product ON inventory_items(product_id);
CREATE INDEX idx_inventory_location ON inventory_items(location_id);
CREATE INDEX idx_inventory_stock ON inventory_items(quantity_on_hand);

-- Inventory Movements
CREATE INDEX idx_movements_product ON inventory_movements(product_id);
CREATE INDEX idx_movements_date ON inventory_movements(created_at);
CREATE INDEX idx_movements_reference ON inventory_movements(reference_id, reference_type);

-- Product Batches
CREATE INDEX idx_batches_product ON product_batches(product_id);
CREATE INDEX idx_batches_expiration ON product_batches(expiration_date);

-- Purchase Orders
CREATE INDEX idx_po_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_date ON purchase_orders(order_date);

-- Returns
CREATE INDEX idx_returns_status ON returns(status);
CREATE INDEX idx_returns_date ON returns(created_at);

-- Alerts
CREATE INDEX idx_alerts_product ON inventory_alerts(product_id);
CREATE INDEX idx_alerts_type ON inventory_alerts(alert_type);
CREATE INDEX idx_alerts_acknowledged ON inventory_alerts(is_acknowledged);

-- =============================================
-- 14. TRIGGERS FOR AUTO-UPDATES
-- =============================================

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_locations_updated_at BEFORE UPDATE ON inventory_locations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_receiving_sessions_updated_at BEFORE UPDATE ON receiving_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON returns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_counts_updated_at BEFORE UPDATE ON stock_counts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sync product stock with inventory items
CREATE OR REPLACE FUNCTION sync_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    -- Update product stock_quantity based on inventory_items
    UPDATE products 
    SET stock_quantity = (
        SELECT COALESCE(SUM(quantity_on_hand), 0)
        FROM inventory_items 
        WHERE product_id = NEW.product_id
    )
    WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER sync_product_stock_trigger 
    AFTER INSERT OR UPDATE OR DELETE ON inventory_items 
    FOR EACH ROW EXECUTE FUNCTION sync_product_stock();

-- Auto-generate alerts for low stock
CREATE OR REPLACE FUNCTION check_stock_alerts()
RETURNS TRIGGER AS $$
BEGIN
    -- Check for low stock
    IF NEW.stock_quantity <= (SELECT COALESCE(min_stock_level, 0) FROM products WHERE id = NEW.id) 
       AND NEW.stock_quantity > 0 THEN
        INSERT INTO inventory_alerts (product_id, alert_type, current_value, threshold_value, message)
        VALUES (NEW.id, 'low_stock', NEW.stock_quantity, 
                (SELECT min_stock_level FROM products WHERE id = NEW.id),
                'Product ' || NEW.name || ' is running low on stock')
        ON CONFLICT (product_id, alert_type) WHERE is_acknowledged = false
        DO UPDATE SET current_value = NEW.stock_quantity, created_at = NOW();
    END IF;
    
    -- Check for out of stock
    IF NEW.stock_quantity = 0 THEN
        INSERT INTO inventory_alerts (product_id, alert_type, current_value, threshold_value, message)
        VALUES (NEW.id, 'out_of_stock', 0, 0, 'Product ' || NEW.name || ' is out of stock')
        ON CONFLICT (product_id, alert_type) WHERE is_acknowledged = false
        DO UPDATE SET created_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER check_stock_alerts_trigger 
    AFTER UPDATE OF stock_quantity ON products 
    FOR EACH ROW EXECUTE FUNCTION check_stock_alerts();

-- =============================================
-- 15. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_modifiers ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read/write all inventory data
-- (You can make this more restrictive based on user roles)
DO $$
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY[
        'categories', 'suppliers', 'products', 'bundle_components', 'product_variants',
        'inventory_locations', 'product_batches', 'inventory_items', 'inventory_movements',
        'purchase_orders', 'purchase_order_items', 'receiving_sessions', 'receiving_items',
        'returns', 'return_items', 'stock_counts', 'stock_count_items', 'inventory_alerts',
        'modifiers', 'product_modifiers'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        EXECUTE format('
            CREATE POLICY "Allow authenticated users full access" ON %I
            FOR ALL TO authenticated
            USING (true)
            WITH CHECK (true)
        ', table_name);
    END LOOP;
END
$$;

-- =============================================
-- 16. SAMPLE DATA (Optional)
-- =============================================

-- Sample categories
INSERT INTO categories (name, code, description) VALUES
('Electronics', 'ELEC', 'Electronic devices and accessories'),
('Clothing', 'CLOTH', 'Apparel and accessories'),
('Food & Beverage', 'FOOD', 'Food and drink items'),
('Books', 'BOOKS', 'Books and educational materials'),
('Home & Garden', 'HOME', 'Home improvement and garden supplies');

-- Sample suppliers
INSERT INTO suppliers (name, code, contact_person, email, phone) VALUES
('Tech Supplies Inc', 'TECH001', 'John Smith', 'john@techsupplies.com', '555-0101'),
('Fashion Forward', 'FASH001', 'Jane Doe', 'jane@fashionforward.com', '555-0102'),
('Fresh Foods Co', 'FRESH001', 'Mike Johnson', 'mike@freshfoods.com', '555-0103');

-- Sample modifiers
INSERT INTO modifiers (name, description, price_adjustment) VALUES
('Extra Large Size', 'Upgrade to extra large', 2.00),
('Gift Wrapping', 'Professional gift wrapping service', 3.50),
('Express Shipping', 'Next day delivery', 15.00),
('Extended Warranty', '2-year extended warranty', 25.00);
