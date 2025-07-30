import type { PageServerLoad } from './$types';
import { createSupabaseClient } from '$lib/server/db';

export const load: PageServerLoad = async ({ locals }) => {
    console.log('🔍 [SERVER] Loading initial page data (not using Telefunc)');
    
    try {
        // For initial page data, we use direct database calls instead of Telefunc
        // This follows Telefunc's recommended pattern
        
        if (!locals.user) {
            return {
                initialData: {
                    success: false,
                    error: 'No user context available',
                    data: null
                },
                telefuncInfo: {
                    message: 'Telefunc should NOT be used for initial page data',
                    recommendedPattern: 'Use direct database calls in load functions',
                    telefuncUsage: 'Use Telefunc for client-side interactions after page load'
                }
            };
        }

        console.log('🔍 [SERVER] User context available, fetching initial data:', locals.user.id);
        
        // Direct database call for initial data (recommended pattern)
        const supabase = createSupabaseClient();
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
            .limit(5);
            
        if (error) {
            throw error;
        }
        
        console.log('✅ [SERVER] Initial data loaded successfully, products count:', products?.length || 0);
        
        return {
            initialData: {
                success: true,
                error: null,
                data: { products: products || [] },
                productsCount: products?.length || 0,
                timestamp: new Date().toISOString()
            },
            telefuncInfo: {
                message: 'This is the CORRECT pattern for initial data',
                recommendedPattern: 'Direct database calls in load functions',
                telefuncUsage: 'Telefunc will be tested on the client-side for interactive features'
            }
        };
    } catch (error) {
        console.error('🚨 [SERVER] Initial data loading failed:', error);
        
        return {
            initialData: {
                success: false,
                error: error.message || 'Unknown error',
                data: null,
                timestamp: new Date().toISOString()
            },
            telefuncInfo: {
                message: 'Error occurred in initial data loading',
                recommendedPattern: 'Direct database calls in load functions',
                telefuncUsage: 'Telefunc should be used client-side only'
            }
        };
    }
};
