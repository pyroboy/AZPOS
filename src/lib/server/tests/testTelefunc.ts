import { onGetProducts } from '$lib/server/telefuncs/product.telefunc';

const testTelefunc = async () => {
  try {
    console.log('🔍 [TEST] Calling onGetProducts Telefunc');
    const filters = { is_active: true };
    const result = await onGetProducts(filters);
    console.log('✅ [TEST] Telefunc success:', result);
  } catch (error) {
    console.error('🚨 [TEST] Telefunc error:', error);
  }
};

// Run the test
if (require.main === module) {
  testTelefunc();
}

