// Quick database debug script
// Run this with: node debug-db.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Debug Environment:', {
  supabaseUrl: SUPABASE_URL ? 'SET' : 'NOT SET',
  serviceKey: SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET'
});

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('✅ Supabase client created');

async function debugDatabase() {
  try {
    console.log('\n🔍 Testing database connection...');
    
    // Test 1: Check if we can connect to any table
    const { data: testConnection, error: connectionError } = await supabase
      .from('products')
      .select('count', { count: 'exact', head: true });
    
    if (connectionError) {
      console.error('❌ Database connection failed:', connectionError);
      return;
    }
    
    console.log('✅ Database connection successful');
    console.log('📊 Total products count:', testConnection);
    
    // Test 2: Get all products (no filters)
    const { data: allProducts, error: allError, count: allCount } = await supabase
      .from('products')
      .select('id, name, is_active, is_archived, created_at', { count: 'exact' })
      .limit(10);
    
    console.log('\n📋 All products sample:');
    console.log('Count:', allCount);
    console.log('Sample data:', allProducts);
    console.log('Error:', allError);
    
    // Test 3: Get only active products
    const { data: activeProducts, error: activeError, count: activeCount } = await supabase
      .from('products')
      .select('id, name, is_active, is_archived', { count: 'exact' })
      .eq('is_active', true)
      .limit(10);
    
    console.log('\n✅ Active products:');
    console.log('Count:', activeCount);
    console.log('Sample data:', activeProducts);
    console.log('Error:', activeError);
    
    // Test 4: Get only non-archived products
    const { data: nonArchivedProducts, error: nonArchivedError, count: nonArchivedCount } = await supabase
      .from('products')
      .select('id, name, is_active, is_archived', { count: 'exact' })
      .eq('is_archived', false)
      .limit(10);
    
    console.log('\n📦 Non-archived products:');
    console.log('Count:', nonArchivedCount);
    console.log('Sample data:', nonArchivedProducts);
    console.log('Error:', nonArchivedError);
    
    // Test 5: Get products with both filters (like in your app)
    const { data: filteredProducts, error: filteredError, count: filteredCount } = await supabase
      .from('products')
      .select('id, name, is_active, is_archived', { count: 'exact' })
      .eq('is_active', true)
      .eq('is_archived', false)
      .limit(10);
    
    console.log('\n🎯 Filtered products (is_active=true AND is_archived=false):');
    console.log('Count:', filteredCount);
    console.log('Sample data:', filteredProducts);
    console.log('Error:', filteredError);
    
    // Test 6: Check data types of boolean fields
    if (allProducts && allProducts.length > 0) {
      const firstProduct = allProducts[0];
      console.log('\n🔬 Data type analysis for first product:');
      console.log('is_active type:', typeof firstProduct.is_active, 'value:', firstProduct.is_active);
      console.log('is_archived type:', typeof firstProduct.is_archived, 'value:', firstProduct.is_archived);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugDatabase();
