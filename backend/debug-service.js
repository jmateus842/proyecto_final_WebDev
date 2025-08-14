const ProductService = require('./src/services/ProductService');

async function debugProductService() {
    try {
        console.log('🔍 Probando ProductService.getAllProducts()...');
        const result = await ProductService.getAllProducts();
        console.log('✅ Éxito:', {
            productsCount: result.products.length,
            pagination: result.pagination
        });
    } catch (error) {
        console.error('❌ Error en ProductService:', error);
        console.error('Stack trace:', error.stack);
    }
}

debugProductService();
